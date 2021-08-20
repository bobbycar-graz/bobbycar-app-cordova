window.addEventListener('load', onDeviceReady);
document.addEventListener('deviceready', onDeviceReady, false);
document.addEventListener("backbutton", onBackKeyDown, false);
document.addEventListener("resume", onResume, false);
document.addEventListener("pause", onPause, false);

/*-----[ App-Settings ]-----*/
var app_settings = {
    startScanOnStartup: true, // Autostart scanning on startup
    debugBuild: false, // Activates few things, redundant
    bleOnlyBobby: false, // Only show BLE devices with "bobby" in their name
    keyNotPluggedIn: false // Set to true for dev just with 5V via flasher
}

var examples = {
    status_msg: '{"v":[47.7,46.91],"t":[31,36.1],"e":[0,0,0,0],"s":[0,0,0,0],"a":[0.04,0.04,0,0.12]}',
    wifi_msg: '{"wifis": ["bobbycar","","","","","","","","",""], "wifi_count": 10}'
}

var globals = {
    current_ble_id: "",
    enableAll: function () {
        console.log("Enabling all...")
        document.getElementsByTagName("body")[0].style.display = ""
        setTimeout(() => {
            document.getElementsByTagName("body")[0].style.opacity = 1
            document.getElementsByTagName("body")[0].style.display = ""
        }, 500);
    },
    disableAll: function () {
        console.log("Disabling all...")
        document.getElementsByTagName("body")[0].style.opacity = 0
        setTimeout(() => {
            document.getElementsByTagName("body")[0].style.display = "none"
            console.log("Disabling done.")
        }, 500);
        /*
        setTimeout(() => {
            if (document.getElementsByTagName("body")[0].style.opacity != 1) {
                alert("Oops. Something is taking to long, so I closed the app")
                navigator.app.exitApp();
            }
        }, 10000);*/
    },
    interval: null,
    availables: []
}

var paused = false;

// ASCII only
function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

// ASCII only
function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}


function onResume() {
    console.log("resuming")
    paused = false;
    if (pages.current == "connect") {
        bluetooth.scanForBobbycars()
    }
}

function onPause() {
    console.log("pausing")
    paused = true;
    pages.lockAll()
    setTimeout(() => {
        pages.unlock(pages.main)
        pages.update(pages.current, pages.main)
        if (typeof globals.current_ble_id !== "undefined") {
            ble.disconnect(globals.current_ble_id, () => { console.log("pausing done, disconnected from " + globals.current_ble_id); globals.current_ble_id = undefined; }, (error) => { console.error("error in pausing: ", error); globals.current_ble_id = undefined });
        } else {
            console.log("pausing done, skipping ble disconnect")
        }
    }, 350)
}

function onDeviceReady() {
    //Init
    screen.orientation.lock("portrait")
    document.getElementsByTagName("html")[0].style.opacity = 1
    document.getElementsByClassName("start-scan")[0].onclick = function () { bluetooth.scanForBobbycars() }
    document.getElementsByClassName("disconnect-ble")[0].onclick = function () { bluetooth.disconnect() }
    if (app_settings.debugBuild) {
        bluetooth.discovered_devices = [{ "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }, { "hiddcdcdcdcdcd": ["11.11.11.11.11.11.11.11.11", "2222"] }]
        bluetooth.updateList()
    }
    navbar.init()
    pages.init()
    bluetooth.init()
}

function onBackKeyDown() {
    if (pages.current != "connect") globals.disableAll();
    setTimeout(() => {
        switch (pages.current) {
            case "livedata":
                let uuid = globals.current_ble_id
                console.log("Disconnecting from ID " + uuid)
                ble.disconnect(uuid, () => {
                    pages.lockAll()
                    pages.unlock("connect")
                    pages.update(pages.current, "connect")
                    console.log("Disconnected from " + uuid)
                    globals.current_ble_id = ""
                    globals.enableAll()
                }, (error) => {
                    console.error("backKeyDisconnect", error)
                    pages.lockAll()
                    pages.unlock("connect")
                    pages.update(pages.current, "connect")
                    globals.enableAll()
                })
                break;
        }
    }, 500);
}

function createIntervals() {
    globals.interval = window.setInterval(() => {
        if (!paused) {
            bluetooth.check();
            pages[pages.current].handle();
        }
    }, 500);
}

function deleteIntervals() {
    clearInterval(globals.interval)
}

function getPageByElement(element, maxIter = 10) {
    let currentElement = element;
    let iterations = 0;
    while (currentElement.tagName.toLowerCase() != "page" && currentElement.tagName.toLowerCase() != "html" && iterations < maxIter) {
        currentElement = currentElement.parentElement;
        iterations++
    }
    if (currentElement.tagName.toLowerCase() != "html")
        return currentElement;
    else
        return null;
}

/*------[ Bobbycar Functions ]------*/
var bobbycar = {
    parseLiveStats: function (json, domElement) {

        if (pages.current != getPageByElement(domElement).getAttribute("name")) return; // Only update if page is visible

        let checkstr = JSON.stringify(json.v)
        if (typeof json !== "object") return;
        let occurrences = (checkstr.match(/null/g) || []).length
        console.log(json.v, occurrences)
        if (occurrences > 0) {
            // Do stuff for case that boards don't send anything
            domElement.style.display = "none"
            let err_str = "";

            if (checkstr.split(",")[0].includes("null") && checkstr.split(",")[1].includes("null")) {
                err_str = "Both boards no data"
            } else if (checkstr.split(",")[0].includes("null")) {
                err_str = "Front board no data"
            } else if (checkstr.split(",")[1].includes("null")) {
                err_str = "Back board no data"
            }
            console.log(err_str)
            pages[pages.current].showAlert("bobbycar-invalid-data", 0, err_str)
        } else {
            domElement.style.display = "flex"
            let status = {}
            try {
                status = {
                    front: {
                        voltage: json.v[0].toFixed(2),
                        temperature: json.t[0].toFixed(2),
                        left: {
                            error: json.e[0],
                            speed: json.s[0].toFixed(2),
                            ampere: json.a[0].toFixed(2),
                        },
                        right: {
                            error: json.e[1],
                            speed: json.s[1].toFixed(2),
                            ampere: json.a[1].toFixed(2),
                        }
                    },

                    back: {
                        voltage: json.v[1].toFixed(2),
                        temperature: json.t[1].toFixed(2),
                        left: {
                            error: json.e[2],
                            speed: json.s[2].toFixed(2),
                            ampere: json.a[2].toFixed(2),
                        },
                        right: {
                            error: json.e[3],
                            speed: json.s[3].toFixed(2),
                            ampere: json.a[3].toFixed(2),
                        }
                    }
                }
            } catch (err) {
                console.error("bobbycar->parseLiveStats", err)
                return
            }

            let keys = Object.keys(status);
            keys.forEach((key) => {
                let board = domElement.getElementsByTagName(key)[0]
                let board_keys = Object.keys(status[key])
                board_keys.forEach((property) => {
                    let domProperty = board.getElementsByTagName(property)[0]
                    let value = status[key][property]
                    if (typeof value !== "object") {
                        domProperty.getElementsByTagName("value")[0].innerHTML = value
                    } else {
                        let valueKeys = Object.keys(value);
                        valueKeys.forEach((valueKey) => {
                            let _value = value[valueKey];
                            domProperty.getElementsByTagName(valueKey)[0].getElementsByTagName("value")[0].innerHTML = _value
                        });
                    }
                })

            })
            //domElement.getElementsByTagName("voltage")[0].innerHTML = `${status.front.batVoltage}V`
        }
    }
}


/*------[ BluetoothLowEnergy ]------*/
var bluetooth = {
    init: function () {
        if (!app_settings.debugBuild) {
            setTimeout(() => {
                createIntervals()
                bluetooth.check();
                pages[pages.current].handle();
                if (app_settings.startScanOnStartup && !app_settings.debugBuild) setTimeout(() => { bluetooth.scanForBobbycars(); }, 300)
            }, 500);
        }
    },

    disconnect: function () {
        let timeout = 1;
        if (pages.current != "connect") { globals.disableAll(); timeout = 500; }
        if (typeof pages[pages.current].onDisconnectBLE !== "undefined")
            pages[pages.current].onDisconnectBLE()
        setTimeout(() => {
            let uuid = globals.current_ble_id
            console.log("Disconnecting from ID " + uuid)
            ble.disconnect(uuid, () => {
                pages.lockAll()
                pages.unlock("connect")
                pages.update(pages.current, "connect")
                console.log("Disconnected from " + uuid)
                globals.current_ble_id = ""
                setTimeout(() => {
                    globals.enableAll();
                }, 250)
            }, (error) => {
                console.error(error)
                pages.lockAll()
                pages.unlock("connect")
                pages.update(pages.current, "connect")
                globals.enableAll()
            })
        }, timeout);
    },

    check: function () {
        // console.log("Checking if ble is enabled");
        ble.isEnabled(bluetooth.ble_en_handler, bluetooth.ble_en_handler);
        ble.isLocationEnabled(bluetooth.ble_loc_handler, bluetooth.ble_loc_handler);
        bluetooth.en = (bluetooth.ble_enabled && bluetooth.location_enabled)
    },

    ble_en_handler: function (msg) {
        bluetooth.ble_enabled = (msg == "OK") ? true : false
    },
    ble_loc_handler: function (msg) {
        bluetooth.location_enabled = (msg == "OK") ? true : false
    },

    ble_enabled: false,
    location_enabled: false,
    en: false,
    scanning: false,

    service_uuid: "0335e46c-f355-4ce6-8076-017de08cee98",

    characteristics: {
        livestatsCharacteristic: {
            uuid: "a48321ea-329f-4eab-a401-30e247211524",
            types: ["READ", "NOTIFY"]
        },
        remotecontrolCharacteristic: {
            uuid: "4201def0-a264-43e6-946b-6b2d9612dfed",
            types: ["WRITE"]
        },
        wirelessConfig: {
            uuid: "4201def1-a264-43e6-946b-6b2d9612dfed",
            types: ["WRITE"]
        },
        getwifilist: {
            uuid: "4201def2-a264-43e6-946b-6b2d9612dfed",
            types: ["READ"]
        }
    },

    discovered_devices: [],

    scanForBobbycars: function () {
        document.getElementsByClassName("ble-device-list")[0].innerHTML = null;
        if (bluetooth.ble_enabled && bluetooth.location_enabled) {
            bluetooth.scanEvent(0)
        } else {
            if (!bluetooth.ble_enabled && !bluetooth.location_enabled) {
                alert("Please enable location and BLE!")
            } else {
                if (bluetooth.location_enabled) alert("Please enable location for this app!")
                if (bluetooth.ble_enabled) alert("Please enable Bluetooth Low Energy!")
            }
        }
    },

    ble_connect_res: {},

    updateList: function () {
        let device_list = document.getElementsByClassName("ble-device-list")[0];
        device_list.innerHTML = null;
        if (bluetooth.discovered_devices.length > 0) {
            bluetooth.discovered_devices.forEach((device) => {
                let li = document.createElement("li")
                let entry = document.createElement("button")
                entry.classList.add("connect-button")
                let name = Object.keys(device)[0]
                let id = device[name][0]
                let rssi = device[name][1]
                entry.innerHTML = `<span class="name">${name}</span><span class="id">${id}</span>`;
                entry.onclick = function () {
                    bluetooth.connect(this);
                }
                entry.dataset.uuid = id
                li.appendChild(entry)
                device_list.appendChild(li)
            })
        } else {
            let li = document.createElement("li")
            let entry = document.createElement("button")
            entry.classList.add("connect-button")
            entry.innerHTML = `<span>No devices found</span>`;
            li.appendChild(entry)
            device_list.appendChild(li)
        }
    },

    scanEvent: function (event) {
        let btn = document.getElementsByClassName("start-scan")[0];
        switch (event) {
            case 0: //Scan started
                bluetooth.scanning = true
                bluetooth.discovered_devices = []
                document.getElementsByClassName("ble-device-list")[0].innerHTML = null;

                btn.setAttribute("disabled", "");
                btn.innerHTML = "Scanning for devices...";
                btn.style.backgroundColor = "rgb(48, 181, 0)";
                console.log("Scan started...");

                ble.startScan([], (data) => {
                    let obj = {};
                    obj[data.name] = [data.id, data.rssi]
                    if (typeof data.name !== "undefined")
                        console.log("Discovered new device: ", data.name)
                    if (typeof data.name !== "undefined") {
                        if (app_settings.bleOnlyBobby) {
                            if (data.name.includes("bobby")) {
                                bluetooth.discovered_devices.push(obj)
                                bluetooth.updateList()
                            }
                        } else {
                            bluetooth.discovered_devices.push(obj)
                            bluetooth.updateList()
                        }
                    }
                }, (error) => {
                    console.error("startScanError", error)
                    bluetooth.scanEvent(1)
                    return
                });

                bluetooth.timeout = setTimeout(() => {
                    ble.stopScan()
                    bluetooth.scanEvent(1)
                }, 7000)
                break;

            case 1: //Scan done
                if (bluetooth.en) {
                    btn.removeAttribute("disabled");
                    btn.innerHTML = "Start Scan";
                    btn.style.backgroundColor = "#202227";
                    bluetooth.discovered_devices.sort((a, b) => {
                        if (a[1] < b[1]) // b has better empfang
                            return 1
                        if (a[1] > b[1])
                            return -1
                        if (a[1] == b[1])
                            return 0
                    })

                    bluetooth.updateList()
                    bluetooth.scanning = false
                }
                break;
        }
    },

    connect: function (node) {
        let uuid = node.dataset.uuid;
        globals.disableAll();
        ble.connect(uuid, (data) => {
            globals.current_ble_id = uuid;
            let characteristics = bluetooth.characteristics; // Saved characteristics
            let bleReceivedChars = data.characteristics // Received characteristics

            let list = [];
            let availables = []; // Available stuff as strings[]
            bleReceivedChars.forEach((char) => {
                let keys = Object.keys(characteristics);
                for (let index = 0; index < keys.length; index++) {
                    let current_key = keys[index]
                    // let current_characteristic = characteristics[current_key] // Commented out because not used
                    if (bluetooth.service_uuid == char.service) {
                        if (!list.includes(char.characteristic)) {
                            list.push(char.characteristic)
                            for (let _index = 0; _index < keys.length; _index++) {
                                let saved_characteristic = characteristics[keys[_index]];
                                if (saved_characteristic.uuid == char.characteristic)
                                    availables.push(keys[_index]);
                            }
                        }
                    }
                }
            })

            if (availables.length > 0 && availables.includes("livestatsCharacteristic")) {

                if (availables.includes("remotecontrolCharacteristic")) pages.unlock("remotecontrol")
                if (availables.includes("wirelessConfig") || availables.includes("getwifilist")) pages.unlock("settings")

                globals.availables = availables
                globals.enableAll()

                pages.unlock("livedata")
                pages.update(pages.current, "livedata")
                pages.lock("connect")

            } else {
                globals.enableAll();
                pages[pages.current].showAlert("no-bobbycar-service-discovered", 5000);
            }
        }, (error) => { console.error("connect-error", JSON.stringify(error)); pages.lockAll(); pages.unlock(pages.main); pages.update(pages.current, pages.main); bluetooth.scanForBobbycars(); /*alert("Error: " + error.errorMessage); */globals.enableAll(); pages[pages.current].showAlert("ble-disconnected-err", 4000, error.errorMessage) })
    }
}


/*------[ Navbar ]------*/
var navbar = {
    init: () => {
        let nav_items = document.getElementsByClassName("navbar-item")
        for (let index = 0; index < nav_items.length; index++) {
            let element = nav_items[index]
            let text = element.children[0].innerHTML.toLowerCase()
            element.href = "#" + text
            element.onclick = function () { pages.switchPage(this) }
            element.classList.add("nav-" + text)
        }
    }
}

/*------[ Pages ]------*/
var pages = {
    init: function () {
        pages.update()
        pages.lockAll()
        pages.unlock(pages.current)

        let _pages = document.getElementsByTagName("navbar-item");
        for (let index = 0; index < _pages.length; index++) {
            let _page = _pages[index];
            if (!_page.classList.contains("current"))
                _page.classList.add("current");
        }
    },

    unlock: function (name) {
        document.getElementsByClassName("nav-" + name)[0].classList.remove("locked");
        return document.querySelector("page[name=" + name + "]").classList.remove("locked");
    },
    lock: function (name) {
        document.getElementsByClassName("nav-" + name)[0].classList.add("locked");
        return document.querySelector("page[name=" + name + "]").classList.add("locked");
    },
    unlockAll: function () {
        let list = document.querySelectorAll("page")
        for (let index = 0; index < list.length; index++) {
            if (list[index].classList.contains("locked"))
                list[index].classList.remove("locked");
        }

        list = document.getElementsByClassName("navbar-item")
        for (let index = 0; index < list.length; index++) {
            if (list[index].classList.contains("locked"))
                list[index].classList.remove("locked");
        }
    },
    lockAll: function () {
        let list = document.querySelectorAll("page")
        for (let index = 0; index < list.length; index++) {
            if (!list[index].classList.contains("locked"))
                list[index].classList.add("locked");
        }

        list = document.getElementsByClassName("navbar-item")
        for (let index = 0; index < list.length; index++) {
            if (!list[index].classList.contains("locked"))
                list[index].classList.add("locked");
        }
    },

    switchPage: (item) => {
        let page = item.href.split("#")[1];
        pages.update(pages.current, page)
    },

    current: "connect",
    main: "connect",

    update: function (current = pages.current, page = pages.current) {
        if (document.querySelector("page[name=" + page + "]").classList.contains("locked")) return;
        pages.current = page
        let _pages = document.getElementsByTagName("page");
        for (let index = 0; index < _pages.length; index++) {
            let _page = _pages[index];
            _page.style.display = "none"
        }
        document.querySelector("page[name=" + page + "]").style.display = "flex"
        pages[current].exit();
        pages[page].init();

        _pages = document.getElementsByClassName("navbar-item");
        for (let index = 0; index < _pages.length; index++) {
            let _page = _pages[index];
            if (_page.classList.contains("current"))
                _page.classList.remove("current");
        }

        if (!document.getElementsByClassName("nav-" + page)[0].classList.contains("current"))
            document.getElementsByClassName("nav-" + page)[0].classList.add("current");

        /*
        document.getElementsByClassName("nav-"+current)[0].style.textDecoration = "none"
        document.getElementsByClassName("nav-"+page)[0].style.textDecoration = "underline"
        */

        document.documentElement.focus();
    },

    connect: {
        init: function () {
            console.log("connect -> init()")
        },
        exit: function () {
            console.log("connect -> exit()")
        },
        handle: function () {
            console.log("connect -> handle()")
            let btn = document.getElementsByClassName("start-scan")[0];
            if (!bluetooth.en) {
                if (!btn.hasAttribute("disabled")) btn.setAttribute("disabled", "")
                btn.style.backgroundColor = "#d20000";
                btn.innerHTML = "Please enable BLE";
                ble.stopScan();
                bluetooth.scanning = false
                clearTimeout(bluetooth.timeout);
            } else if (!bluetooth.scanning) {
                if (btn.hasAttribute("disabled")) btn.removeAttribute("disabled")
                btn.style.backgroundColor = "#202227";
                btn.innerHTML = "Start Scan";
            }
        },
        showAlert: function (condition, timeout = 1000, err_str = "") {
            let alert = document.querySelector("page[name=connect]").querySelector(`alert[condition=${condition}]`);
            if (typeof alert === "undefined") return
            alert.parentElement.style.opacity = "1";
            alert.parentElement.style.display = "block";
            if(err_str !== "")
                alert.getElementsByTagName("err_str")[0].innerHTML = err_str
            if (timeout > 0) {
                setTimeout(() => {
                    alert.parentElement.style.opacity = "0";
                    setTimeout(() => { alert.parentElement.style.display = "none"; }, 500);
                }, timeout);
            }
        },
        data: {}
    },
    livedata: {
        init: function () {
            console.log("livedata -> init()")
            pages.livedata.data["connected"] = true
            let char_uuid = pages.livedata.data["readIfNotified"] = bluetooth.characteristics.livestatsCharacteristic.uuid
            ble.startNotification(globals.current_ble_id, bluetooth.service_uuid, char_uuid, (rawData) => {
                if (pages.livedata.data["connected"] == true)
                    ble.read(globals.current_ble_id, bluetooth.service_uuid, char_uuid, pages.livedata.receivedLiveData, (error) => { console.error(`Error reading from ${char_uuid}: ${error}`) })
            }, (error) => { console.error(`BLE notify error: ${error}`) })
        },
        exit: function () {
            console.log("livedata -> exit()")
            if(pages.livedata.data.connected == false) return
            let char_uuid = bluetooth.characteristics.livestatsCharacteristic.uuid
            pages.livedata.data["connected"] = false
            ble.stopNotification(globals.current_ble_id, bluetooth.service_uuid, char_uuid, () => { console.log("Successfuly disconnected from " + char_uuid); }, (error) => { console.error(`Error while disconnecting from ${char_uuid}: ${error}`) })
        },
        handle: function () {
            console.log("livedata -> handle()")
        },
        data: {},
        receivedLiveData: function (rawData) {
            let data = "";
            try {
                data = JSON.parse(bytesToString(rawData))
                if (app_settings.keyNotPluggedIn == true) {
                    data = JSON.parse(examples.status_msg)
                }
            } catch (error) {
                // console.error(error, bytesToString(rawData))
            }
            if (typeof data !== "undefined")
                bobbycar.parseLiveStats(data, document.getElementsByTagName("livedata")[0]);
        },
        showAlert: function (condition, timeout = 1000, err_str) {
            let alert = document.querySelector("page[name=livedata]").querySelector(`alert[condition=${condition}]`);
            if (typeof alert === "undefined") return
            alert.parentElement.style.opacity = "1";
            alert.parentElement.style.display = "block";
            if(err_str !== "")
                alert.getElementsByTagName("err_str")[0].innerHTML = err_str
            if (timeout > 0) {
                setTimeout(() => {
                    alert.parentElement.style.opacity = "0";
                    setTimeout(() => { alert.parentElement.style.display = "none"; }, 500);
                }, timeout);
            }
        },
        onDisconnectBLE: function () {
            let char_uuid = bluetooth.characteristics.livestatsCharacteristic.uuid
            pages.livedata.data["connected"] = false
            ble.stopNotification(globals.current_ble_id, bluetooth.service_uuid, char_uuid, () => { console.log("Successfuly disconnected from " + char_uuid); }, (error) => { console.error(`Error while disconnecting from ${char_uuid}: ${error}`) })
        }
    },
    remotecontrol: {
        init: function () {
            console.log("remotecontrol -> init()")
        },
        exit: function () {
            console.log("remotecontrol -> exit()")
        },
        handle: function () {
            console.log("remotecontrol -> handle()")
        },
        data: {},
        showAlert: function (condition, timeout = 1000, err_str = "") {
            let alert = document.querySelector("page[name=remotecontrol]").querySelector(`alert[condition=${condition}]`);
            if (typeof alert === "undefined") return
            alert.parentElement.style.opacity = "1";
            alert.parentElement.style.display = "block";
            if(err_str !== "")
                alert.getElementsByTagName("err_str")[0].innerHTML = err_str
            if (timeout > 0) {
                setTimeout(() => {
                    alert.parentElement.style.opacity = "0";
                    setTimeout(() => { alert.parentElement.style.display = "none"; }, 500);
                }, timeout);
            }
        }
    },
    settings: {
        init: function () {
            console.log("settings -> init()")
        },
        exit: function () {
            console.log("settings -> exit()")
        },
        handle: function () {
            console.log("settings -> handle()")
        },
        data: {},
        showAlert: function (condition, timeout = 1000, err_str) {
            let alert = document.querySelector("page[name=settings]").querySelector(`alert[condition=${condition}]`);
            if (typeof alert === "undefined") return
            alert.parentElement.style.opacity = "1";
            alert.parentElement.style.display = "block";
            if(err_str !== "")
                alert.getElementsByTagName("err_str")[0].innerHTML = err_str
            if (timeout > 0) {
                setTimeout(() => {
                    alert.parentElement.style.opacity = "0";
                    setTimeout(() => { alert.parentElement.style.display = "none"; }, 500);
                }, timeout);
            }
        }
    }
}