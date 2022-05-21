const { SerialPort } = require("serialport");
const setupDiv = document.getElementById("setup"),
  roomsSelect = document.getElementById("rooms"),
  portsSelect = document.getElementById("ports"),
  connectButton = document.getElementById("connectButton");
const mainDiv = document.getElementById("main");
const roomsData = [
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 201, 202, 203, 204, 205,
  206, 207, 208, 209, 210,
];
let _port,
  mainBuffer,
  len,
  copyCount = 0,
  listOfTags = new Set();
async function load() {
  mainDiv.style.display = "none";
  for (var i = 0; i < roomsData.length; i++) {
    var option = document.createElement("option");
    option.text = "Room: " + roomsData[i];
    option.value = roomsData[i].toString();
    roomsSelect.appendChild(option);
  }
  await SerialPort.list().then((ports) => {
    ports.forEach((port) => {
      var option = document.createElement("option");
      option.text = port.path;
      option.value = port.path;
      portsSelect.appendChild(option);
    });
  });

  _port = new SerialPort({
    path: portPath,
    baudRate: 57600,
    autoOpen: true,
  });
  const parser = _port.pipe(new ByteLengthParser({ length: 1 }));
  parser.on("data", (data) => {
    push(data);
  });
}
load();
function push(chunk) {
  if (!mainBuffer) {
    len = chunk[0];
    mainBuffer = Buffer.alloc(len + 1);
    push(chunk);
    return;
  }
  chunk.copy(mainBuffer, copyCount);
  copyCount += chunk.length;
  if (copyCount === mainBuffer.length) {
    parse();
  }
}

function parse() {
  if (!mainBuffer) throw new Error("Buffer is empty");
  if (!len) throw new Error("Len is empty");
  const B = mainBuffer;
  console.log(B.toString("hex"));

  if (B.length < 5) throw new Error("Response must be at least 5 bytes");
  if (B.length > len + 1)
    throw new Error("Response length is greater than buffer length");

  mainBuffer = undefined; // clear buffer
  copyCount = 0;
  len = 0;

  if (B.toString("hex") === "050001fbf23d") {
    console.log("EMPTY");
    return;
  }

  const addr = B.readUint8(1);
  const cmd = B.readUint8(2);
  const status = B.readUint8(3);
  const tags_count = B.readUint8(4);
  const data = B.slice(5, B.length - 2);
  const checksum_status = verify_checksum(
    B.slice(0, B.length - 2),
    B.slice(B.length - 2, B.length)
  );
  if (!checksum_status) throw new Error("Checksum is invalid");
  let pointer = 0,
    i = 0;
  console.log({ tags_count });

  while (i < tags_count) {
    const tag_len = data[pointer];
    const tag_data = data.slice(pointer + 1, tag_len + pointer + 1);
    console.log({ tag_data });
    listOfTags.add({ id: toHexString(tag_data), date: new Date() });
    pointer += tag_len + 1;
    i++;
  }
}
function toHexString(byteArray) {
  return Array.prototype.map
    .call(byteArray, function (byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    })
    .join("");
}
const PRESET_VALUE = 0xffff;
const POLYNOMIAL = 0x8408;
function checksum(pucY) {
  let ucCrc = PRESET_VALUE;
  for (let i = 0; i < pucY.length; i++) {
    ucCrc ^= pucY[i];
    for (let j = 0; j < 8; j++) {
      if ((ucCrc & 0x01) === 1) {
        ucCrc = (ucCrc >> 1) ^ POLYNOMIAL;
      } else {
        ucCrc = ucCrc >> 1;
      }
    }
  }
  return ucCrc;
}
function verify_checksum(data_bytes, checksum_bytes) {
  const data_crc = checksum(data_bytes);
  const crc_msb = data_crc >> 8;
  const crc_lsb = data_crc & 0xff;
  return checksum_bytes[0] == crc_lsb && checksum_bytes[1] == crc_msb;
}
async function connect() {
  setupDiv.style.display = "none";
  mainDiv.style.display = "block";
}
connectButton.addEventListener("click", connect);
