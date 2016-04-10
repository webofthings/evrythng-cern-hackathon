#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""

@author: joelvogt

"""

import paho.mqtt.client as mqtt
from json import load, loads, dumps

lab_fan = dict(thng_id = "UXQWgh5UKtqDBfSATSCe2pym", api_key = "6JGcFmD0Zg8cZ1zmK4zNpdnNjgDHEnd7LRuW3M1474jIxiHTwxuxlyOeRatScno7vib4i0P3Dh42XGYO", thng_property = "state")

def on_connect(client, obj, flags, rc):
    print("Connecting")
    client.subscribe("/thngs/{0}/properties/{1}".format(lab_fan["thng_id"], lab_fan["thng_property"]))
    client.publish("/thngs/{0}/properties/{1}".format(lab_fan["thng_id"], lab_fan["thng_property"]), dumps([dict(value=False)]))
    client.subscribe("/thngs/{0}/actions/{1}".format(lab_fan["thng_id"],'_fanOff'))
    client.subscribe("/thngs/{0}/actions/{1}".format(lab_fan["thng_id"],'_fanOn'))

def on_message(client, userdata, msg):
    message = loads(msg.payload)
    print(message)

mqtt_connection = mqtt.Client()
mqtt_connection.on_connect = on_connect
mqtt_connection.on_message = on_message
mqtt_connection.username_pw_set("authorization", lab_fan['api_key'])
mqtt_connection.tls_insecure_set(True)
mqtt_connection.connect_async("mqtt.evrythng.com", 1883, 60)
mqtt_connection.loop_forever()
