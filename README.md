# Notes

Example status message: {"v":[47.7,46.91],"t":[31,36.1],"e":[0,0,0,0],"s":[0,0,0,0],"a":[0.04,0.04,0,0.12]}

Example wifi message: {"wifis": ["bobbycar","","","","","","","","",""], "wifi_count": 10}

Example set-wifi message from app {"type":"wifi","wifi_index":0,"wifi_ssid":"bobbycar","wifi_pass":"12345678"}

v: [front.batVoltage, back.batVoltage]
t: [front.boardTemp, back.boardTemp]
e: [fl.error, fr.error, bl.error, br.error]
s: [fl.speed, fr.speed, bl.speed, br.speed]
a: [fl.ampere, fr.ampere, bl.ampere, br.ampere]

# Todo

- Blend in logo when nothing is displayed (disableAll)
- Reverse-engineer gamepad from 0xFEEDC0DE64
