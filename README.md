# Notes

Example status message: 
```json
{"v":[47.7,46.91],"t":[31,36.1],"e":[0,0,0,0],"s":[0,0,0,0],"a":[0.04,0.04,0,0.12]}
```

Example wifi message: 
```json
{"wifis": ["bobbycar","","","","","","","","",""], "wifi_count": 10}
```

Example set-wifi message from app:
```json
{"type":"wifi","wifi_index":0,"wifi_ssid":"bobbycar","wifi_pass":"12345678"}
```

v: [front.batVoltage, back.batVoltage]
t: [front.boardTemp, back.boardTemp]
e: [fl.error, fr.error, bl.error, br.error]
s: [fl.speed, fr.speed, bl.speed, br.speed]
a: [fl.ampere, fr.ampere, bl.ampere, br.ampere]

# Todo

- Blend in logo when nothing is displayed (disableAll)
- Reverse-engineer gamepad from 0xFEEDC0DE64

# Build the app

To download cordova, run `npm install -g cordova`. After that, you have to install the android sdk and java jdk. For that, [please follow this guide.](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html). Now you should be able to run `cordova run android --device` (with your android phone plugged in).

For iOS, you have to add the iOS-platform to cordova. For that, [please follow this guide.](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html)