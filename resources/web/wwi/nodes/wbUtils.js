// Copyright 1996-2021 Cyberbotics Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {WbVector3} from './utils/wbVector3.js';
import {WbVector4} from './utils/wbVector4.js';
import {WbTransform} from './wbTransform.js';
import {WbWorld} from './wbWorld.js';

function array3Pointer(x, y, z) {
  const data = new Float32Array([x, y, z]);
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  return dataHeap.byteOffset;
}

function arrayXPointer(array) {
  const data = new Uint8ClampedArray(array);
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  return dataHeap.byteOffset;
}

function arrayXPointerInt(array) {
  const data = new Int32Array(array);
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  return dataHeap.byteOffset;
}

function arrayXPointerFloat(array) {
  const data = new Float32Array(array);
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  return dataHeap.byteOffset;
}

function pointerOnFloat(float) {
  const data = new Float32Array(1);
  data[0] = float;
  const nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  return dataHeap.byteOffset;
}

function direction(vec4) {
  const c = Math.cos(vec4.w);
  const s = Math.sin(vec4.w);
  const t = 1 - c;
  const tTimesZ = t * vec4.z;
  return new WbVector3(tTimesZ * vec4.x + s * vec4.y, tTimesZ * vec4.y - s * vec4.x, tTimesZ * vec4.z + c);
}

function right(vec4) {
  const c = Math.cos(vec4.w);
  const s = Math.sin(vec4.w);
  const t = 1 - c;
  const tTimesX = t * vec4.x;
  return new WbVector3(tTimesX * vec4.x + c, tTimesX * vec4.y + s * vec4.z, tTimesX * vec4.z - s * vec4.y);
}

function up(vec4) {
  const c = Math.cos(vec4.w);
  const s = Math.sin(vec4.w);
  const t = 1 - c;
  const tTimesY = t * vec4.y;
  return new WbVector3(tTimesY * vec4.x - s * vec4.z, tTimesY * vec4.y + c, tTimesY * vec4.z + s * vec4.x);
}

function length(vec3) {
  return Math.sqrt(vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z);
}

function vec4ToQuaternion(vec4) {
  const halfAngle = 0.5 * vec4.w;
  const sinusHalfAngle = Math.sin(halfAngle);
  const cosinusHalfAngle = Math.cos(halfAngle);
  return glm.quat(cosinusHalfAngle, vec4.x * sinusHalfAngle, vec4.y * sinusHalfAngle, vec4.z * sinusHalfAngle);
}

function quaternionToVec4(quat) {
  let angle;
  if (quat.w >= 1.0)
    angle = 0.0;
  else if (quat.w <= -1.0)
    angle = 2.0 * Math.PI;
  else
    angle = 2.0 * Math.acos(quat.w);

  // normalise axes
  const inv = 1.0 / Math.sqrt(quat.x * quat.x + quat.y * quat.y + quat.z * quat.z);
  const x = quat.x * inv;
  const y = quat.y * inv;
  const z = quat.z * inv;

  return new WbVector4(x, y, z, angle);
}

function fromAxisAngle(x, y, z, angle) {
  const result = new WbVector4();
  let l = x * x + y * y + z * z;
  if (l > 0.0) {
    angle *= 0.5;
    result.w = Math.cos(angle);
    l = Math.sin(angle) / Math.sqrt(l);
    result.x = x * l;
    result.y = y * l;
    result.z = z * l;
  } else {
    result.w = 1.0;
    result.x = 0.0;
    result.y = 0.0;
    result.z = 0.0;
  }
  return result;
}

function findUpperTransform(node) {
  if (typeof node === 'undefined')
    return undefined;

  let n = WbWorld.instance.nodes.get(node.parent);
  while (typeof n !== 'undefined') {
    if (n instanceof WbTransform)
      return n;
    else
      n = n.parent;
  }
  return undefined;
}

function nodeIsInBoundingObject(node) {
  if (typeof node === 'undefined' || typeof node.parent === 'undefined')
    return false;

  const parent = WbWorld.instance.nodes.get(node.parent);
  if (typeof parent !== 'undefined') {
    if (parent instanceof WbTransform && typeof parent.boundingObject !== 'undefined')
      return parent.boundingObject === node;
    else if (typeof parent.parent !== 'undefined')
      return nodeIsInBoundingObject(parent);
  }

  return false;
}

function getAncestor(node) {
  if (typeof node !== 'undefined' && typeof node.parent !== 'undefined') {
    let parent = WbWorld.instance.nodes.get(node.parent);

    if (typeof parent !== 'undefined')
      return getAncestor(parent);
  }

  return node;
}

export {array3Pointer, arrayXPointer, arrayXPointerInt, arrayXPointerFloat, pointerOnFloat, direction, up, right, length, vec4ToQuaternion, quaternionToVec4, fromAxisAngle, findUpperTransform, nodeIsInBoundingObject, getAncestor};
