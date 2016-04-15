
// Libraries to connect the board to the EVT cloud
#include <SPI.h>
#include <Ethernet.h>
#include <PubSubClient.h>

#define DEBUG 0 //1 to see debug code on the serial port

#define MQTT_HOST "mqtt.evrythng.com"
#define MQTT_HOST_PORT 1883

// EVRYTHNG thng id and api key for the connected radon detector
#define THNG_ID "UDP8Neb8GFQpDUDesSte5bff"
#define DEVICE_API_KEY "Lp1WoHwYKReONRIXO7e1LE4OEQYiohDczm46yDXRJck9fhTUP3tOoOrFSOmsXxxS5DY9U7crirz6HIwc"
#define CLIENT_ID "radondetector"


// Update these with values suitable for your network.
byte mac[] = {
  0x00, 0xAA, 0xBB, 0xCC, 0xDE, 0x02
};

void callback(char* topic, byte* payload, unsigned int length) {
  // handle message arrived
}

EthernetClient ethClient;
PubSubClient client(MQTT_HOST, MQTT_HOST_PORT, callback, ethClient);

void setup()
{
  pinMode(A0, OUTPUT);

  if (DEBUG) {
    Serial.begin(9600);
    delay(100);
    // this check is only needed on the Leonardo:
    while (!Serial) {
      ; // wait for serial port to connect. Needed for Leonardo only
    }
  }
  if (Ethernet.begin(mac) == 0) {
    if (DEBUG) {
      Serial.println("Failed to configure Ethernet using DHCP");
    }
    // no point in carrying on, so do nothing forevermore:
    for (;;)
      ;
  }

  if (DEBUG) {
    // print your local IP address:
    Serial.print("My IP address: ");
    for (byte thisByte = 0; thisByte < 4; thisByte++) {
      // print the value of each byte of the IP address:
      Serial.print(Ethernet.localIP()[thisByte], DEC);
      Serial.print(".");
    }
  }

  if (DEBUG) {
    Serial.println("Ready");
  }
}

char payload[32];
volatile int current_level;
int previous_level = 0;
void loop()
{
  if (!client.loop()) {
    if (client.connect(CLIENT_ID, "authorization", DEVICE_API_KEY)) {
      if (DEBUG) {
        Serial.println("Successfully connected to the cloud");
      }
    } else {
      if (DEBUG) {
        Serial.println("Could not connected to the cloud");
        for (;;)
          ;
      }
    }
  }
  delay(8000);
  current_level = analogRead(A0);
  if (previous_level != current_level) {
    sprintf(payload, "[{\"value\":%d}]", current_level);

    previous_level = current_level;
    client.publish("/thngs/"  THNG_ID  "/properties/concentration", payload);
  }
}
