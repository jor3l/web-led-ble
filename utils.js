const AES_KEY_HEX = '32672f7974ad43451d9c6c894a0e8764';

function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function stringToBytes(str) {
  return new TextEncoder().encode(str);
}

function padTo16Bytes(buffer) {
  const paddedLength = Math.ceil(buffer.length / 16) * 16;
  const padded = new Uint8Array(paddedLength);
  padded.set(buffer);
  return padded;
}

async function importKey(keyBytes) {
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
}

async function encryptECB(data, keyBytes) {
  const key = await importKey(keyBytes);
  const blockSize = 16;
  const encrypted = new Uint8Array(data.length);
  const iv = new Uint8Array(16); // zero IV for simulating ECB

  for (let i = 0; i < data.length; i += blockSize) {
    const block = data.slice(i, i + blockSize);
    const paddedBlock = padTo16Bytes(block);
    const result = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      paddedBlock
    ));
    encrypted.set(result.slice(0, blockSize), i);
  }

  return encrypted;
}

/**
 * Generates a BLE command buffer for the Shining Mask.
 * @param {string} type - 'LIGHT' | 'IMAG' | 'TEXT' etc.
 * @param {Object} options - Command options.
 * @returns {Promise<Uint8Array>} - Encrypted BLE command.
 */
async function getBLELedCommand(type, options) {
  const keyBytes = hexToBytes(AES_KEY_HEX);
  let commandAscii = '';
  let args = [];

  switch (type) {
    case 'LIGHT':
      commandAscii = 'LIGHT';
      if (typeof options.brightness !== 'number' || options.brightness < 0 || options.brightness > 255) {
        throw new Error('Invalid brightness value.');
      }
      args.push(options.brightness);
      break;

    case 'IMAG':
      commandAscii = 'IMAG';
      if (typeof options.imageId !== 'number' || options.imageId < 0 || options.imageId > 0xFFFF) {
        throw new Error('Invalid imageId.');
      }
      args.push((options.imageId >> 8) & 0xFF);
      args.push(options.imageId & 0xFF);
      break;

    case 'TEXT':
      commandAscii = 'TEXT';
      if (typeof options.text !== 'string' || options.text.length === 0) {
        throw new Error('Invalid text.');
      }
      args = Array.from(stringToBytes(options.text));
      break;

    default:
      throw new Error(`Unsupported type: ${type}`);
  }

  const commandBytes = stringToBytes(commandAscii);
  const payload = new Uint8Array(1 + commandBytes.length + args.length);
  payload[0] = 1 + commandBytes.length + args.length;
  payload.set(commandBytes, 1);
  payload.set(args, 1 + commandBytes.length);

  const paddedPayload = padTo16Bytes(payload);
  const encrypted = await encryptECB(paddedPayload, keyBytes);

  return encrypted;
}
