# web-led-ble
Control LED BLE devices with a browser

Based of this documentation: https://github.com/BrickCraftDream/Shining-Mask-stuff/blob/main/ble-protocol.md

basic usage:
```javascript
getBLELedCommand('LIGHT', { brightness: 120 }).then(command => {
  // command is a Uint8Array ready to send via BLE
  console.log("Encrypted BLE Command:", command);
});
```
