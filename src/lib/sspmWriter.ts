import { GeneratedMap } from "./generator";

export async function writeSSPM(
  mapData: GeneratedMap,
  audioBuffer: ArrayBuffer | null,
  coverBuffer: ArrayBuffer | null
): Promise<Blob> {
  const enc = new TextEncoder();
  
  // Base header "SS+m" (0x53 0x53 0x2b 0x6d), V2 (0x02 0x00), reserved (0x00 * 4)
  const header = new Uint8Array([0x53, 0x53, 0x2b, 0x6d, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);

  // notes
  const notes = mapData.Notes;
  let lastMs = 0;
  if (notes.length > 0) lastMs = notes[notes.length - 1].Time;
  
  // markers bytes
  const markersChunks: Uint8Array[] = [];
  for (const n of notes) {
    // each marker: 4 bytes ms, 1 byte type, 1 byte identifier, 2/4 bytes x, 2/4 bytes y
    const isFloat = !Number.isInteger(n.X) || !Number.isInteger(n.Y);
    const idByte = isFloat ? 0x01 : 0x00;
    
    // allocate buffer per note
    const noteBuf = new ArrayBuffer(4 + 1 + 1 + (isFloat ? 8 : 2));
    const dv = new DataView(noteBuf);
    dv.setUint32(0, n.Time, true); // ms (little endian)
    dv.setUint8(4, 0x00); // markerType
    dv.setUint8(5, idByte); // identifier
    
    if (isFloat) {
      dv.setFloat32(6, n.X, true);
      dv.setFloat32(10, n.Y, true);
    } else {
      dv.setUint8(6, Math.round(n.X));
      dv.setUint8(7, Math.round(n.Y));
    }
    markersChunks.push(new Uint8Array(noteBuf));
  }
  
  const totalMarkersLen = markersChunks.reduce((acc, val) => acc + val.length, 0);
  const markersBuffer = new Uint8Array(totalMarkersLen);
  let _moff = 0;
  for (const chunk of markersChunks) {
    markersBuffer.set(chunk, _moff);
    _moff += chunk.length;
  }
  
  // metadata
  const metadataBuf = new ArrayBuffer(18);
  const metaDv = new DataView(metadataBuf);
  metaDv.setUint32(0, lastMs, true);
  metaDv.setUint32(4, notes.length, true);
  metaDv.setUint32(8, notes.length, true); // marker count = note count
  metaDv.setUint8(12, mapData.Difficulty); // diff 
  metaDv.setUint16(13, 0, true); // rating
  metaDv.setUint8(15, audioBuffer ? 1 : 0);
  metaDv.setUint8(16, coverBuffer ? 1 : 0);
  metaDv.setUint8(17, 0); // requires_mod
  const metadata = new Uint8Array(metadataBuf);

  // strings
  const mapIdRaw = enc.encode(mapData.LegacyId);
  const mapNameRaw = enc.encode(mapData.Title);
  const songNameRaw = enc.encode(mapData.SongName);
  
  const mappers = mapData.Mappers || ["AutoMapper"];
  let mappersTotalBytes = 0;
  const mappersRawList: Uint8Array[] = [];
  for (const m of mappers) {
    const raw = enc.encode(m);
    mappersRawList.push(raw);
    mappersTotalBytes += 2 + raw.length;
  }
  
  const stringsTotalLen = 2+mapIdRaw.length + 2+mapNameRaw.length + 2+songNameRaw.length + 2 + mappersTotalBytes;
  const stringsBuf = new ArrayBuffer(stringsTotalLen);
  const strDv = new DataView(stringsBuf);
  const strU8 = new Uint8Array(stringsBuf);
  let soff = 0;
  
  strDv.setUint16(soff, mapIdRaw.length, true); soff+=2;
  strU8.set(mapIdRaw, soff); soff+=mapIdRaw.length;
  
  strDv.setUint16(soff, mapNameRaw.length, true); soff+=2;
  strU8.set(mapNameRaw, soff); soff+=mapNameRaw.length;
  
  strDv.setUint16(soff, songNameRaw.length, true); soff+=2;
  strU8.set(songNameRaw, soff); soff+=songNameRaw.length;
  
  strDv.setUint16(soff, mappers.length, true); soff+=2;
  for (const m of mappersRawList) {
    strDv.setUint16(soff, m.length, true); soff+=2;
    strU8.set(m, soff); soff+=m.length;
  }
  
  // custom data (empty for now)
  const customData = new Uint8Array([0x00, 0x00]);
  
  // Marker Definition
  const markerDefString = enc.encode("ssp_note");
  const markerDefBuf = new ArrayBuffer(1 + 2 + markerDefString.length + 3);
  const mdDv = new DataView(markerDefBuf);
  const mdU8 = new Uint8Array(markerDefBuf);
  mdDv.setUint8(0, 0x01);
  mdDv.setUint16(1, markerDefString.length, true);
  mdU8.set(markerDefString, 3);
  mdDv.setUint8(3 + markerDefString.length, 0x01);
  mdDv.setUint8(4 + markerDefString.length, 0x07);
  mdDv.setUint8(5 + markerDefString.length, 0x00);
  const markerDefinition = new Uint8Array(markerDefBuf);

  // Hash = sha1(marker_definition_bytestring + markers)
  const hashInput = new Uint8Array(markerDefinition.length + markersBuffer.length);
  hashInput.set(markerDefinition, 0);
  hashInput.set(markersBuffer, markerDefinition.length);
  const hashBuffer = await crypto.subtle.digest("SHA-1", hashInput);
  const markerHash = new Uint8Array(hashBuffer);
  
  // Offset logic
  let offset = header.length + markerHash.length + metadata.length + 80 + stringsTotalLen;
  
  const pointersBuf = new ArrayBuffer(80);
  const ptrDv = new DataView(pointersBuf);
  let poff = 0;
  
  const writePtr = (len: number) => {
    if (len === 0) {
      ptrDv.setBigUint64(poff, 0n, true);
      ptrDv.setBigUint64(poff+8, 0n, true);
      poff += 16;
    } else {
      ptrDv.setBigUint64(poff, BigInt(offset), true);
      ptrDv.setBigUint64(poff+8, BigInt(len), true);
      poff += 16;
      offset += len;
    }
  }

  writePtr(customData.length);
  writePtr(audioBuffer ? audioBuffer.byteLength : 0);
  writePtr(coverBuffer ? coverBuffer.byteLength : 0);
  writePtr(markerDefinition.length);
  writePtr(markersBuffer.length);
  
  const pointers = new Uint8Array(pointersBuf);

  // concatenate everything
  const audioArr = audioBuffer ? new Uint8Array(audioBuffer) : new Uint8Array(0);
  const coverArr = coverBuffer ? new Uint8Array(coverBuffer) : new Uint8Array(0);
  
  const finalLen = header.length + markerHash.length + metadata.length + pointers.length + stringsTotalLen + customData.length + audioArr.length + coverArr.length + markerDefinition.length + markersBuffer.length;
  
  const sspmBytes = new Uint8Array(finalLen);
  let cur = 0;
  const append = (arr: Uint8Array) => {
    sspmBytes.set(arr, cur);
    cur += arr.length;
  }
  
  append(header);
  append(markerHash);
  append(metadata);
  append(pointers);
  append(strU8);
  append(customData);
  if(audioBuffer) append(audioArr);
  if(coverBuffer) append(coverArr);
  append(markerDefinition);
  append(markersBuffer);
  
  return new Blob([sspmBytes], { type: 'application/octet-stream' });
}
