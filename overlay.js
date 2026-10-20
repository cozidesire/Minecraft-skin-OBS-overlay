(() => {
  "use strict";

  const CONFIG = {
    launchEverySeconds: 8.5,
    travelSeconds: 34,
    modelHeightVh: 34,
    minModelHeight: 210,
    maxModelHeight: 360,
    leftOffsetVw: 7.25,
    targetFps: 30,
    walkAmount: 0.16,
    swayAmount: 0.22,
  };

  const FACE_DEFS = {
    front: { normal: [0, 0, -1], shade: 1.0 },
    back: { normal: [0, 0, 1], shade: 0.66 },
    right: { normal: [1, 0, 0], shade: 0.82 },
    left: { normal: [-1, 0, 0], shade: 0.74 },
    top: { normal: [0, -1, 0], shade: 1.12 },
    bottom: { normal: [0, 1, 0], shade: 0.58 },
  };

  const UV = {
    head: {
      top: [8, 0, 8, 8], bottom: [16, 0, 8, 8], right: [0, 8, 8, 8],
      front: [8, 8, 8, 8], left: [16, 8, 8, 8], back: [24, 8, 8, 8],
    },
    headOuter: {
      top: [40, 0, 8, 8], bottom: [48, 0, 8, 8], right: [32, 8, 8, 8],
      front: [40, 8, 8, 8], left: [48, 8, 8, 8], back: [56, 8, 8, 8],
    },
    body: {
      top: [20, 16, 8, 4], bottom: [28, 16, 8, 4], right: [16, 20, 4, 12],
      front: [20, 20, 8, 12], left: [28, 20, 4, 12], back: [32, 20, 8, 12],
    },
    bodyOuter: {
      top: [20, 32, 8, 4], bottom: [28, 32, 8, 4], right: [16, 36, 4, 12],
      front: [20, 36, 8, 12], left: [28, 36, 4, 12], back: [32, 36, 8, 12],
    },
    rightArm: {
      top: [44, 16, 4, 4], bottom: [48, 16, 4, 4], right: [40, 20, 4, 12],
      front: [44, 20, 4, 12], left: [48, 20, 4, 12], back: [52, 20, 4, 12],
    },
    rightArmOuter: {
      top: [44, 32, 4, 4], bottom: [48, 32, 4, 4], right: [40, 36, 4, 12],
      front: [44, 36, 4, 12], left: [48, 36, 4, 12], back: [52, 36, 4, 12],
    },
    leftArm: {
      top: [36, 48, 4, 4], bottom: [40, 48, 4, 4], right: [32, 52, 4, 12],
      front: [36, 52, 4, 12], left: [40, 52, 4, 12], back: [44, 52, 4, 12],
    },
    leftArmOuter: {
      top: [52, 48, 4, 4], bottom: [56, 48, 4, 4], right: [48, 52, 4, 12],
      front: [52, 52, 4, 12], left: [56, 52, 4, 12], back: [60, 52, 4, 12],
    },
    rightLeg: {
      top: [4, 16, 4, 4], bottom: [8, 16, 4, 4], right: [0, 20, 4, 12],
      front: [4, 20, 4, 12], left: [8, 20, 4, 12], back: [12, 20, 4, 12],
    },
    rightLegOuter: {
      top: [4, 32, 4, 4], bottom: [8, 32, 4, 4], right: [0, 36, 4, 12],
      front: [4, 36, 4, 12], left: [8, 36, 4, 12], back: [12, 36, 4, 12],
    },
    leftLeg: {
      top: [20, 48, 4, 4], bottom: [24, 48, 4, 4], right: [16, 52, 4, 12],
      front: [20, 52, 4, 12], left: [24, 52, 4, 12], back: [28, 52, 4, 12],
    },
    leftLegOuter: {
      top: [4, 48, 4, 4], bottom: [8, 48, 4, 4], right: [0, 52, 4, 12],
      front: [4, 52, 4, 12], left: [8, 52, 4, 12], back: [12, 52, 4, 12],
    },
  };

  const PARTS = [
    { box: [-4, 4, 0, 8, -4, 4], uv: "head", outer: "headOuter", inflate: 0.5, pivot: [0, 4, 0], motion: 0 },
    { box: [-4, 4, 8, 20, -2, 2], uv: "body", outer: "bodyOuter", inflate: 0.28, pivot: [0, 8, 0], motion: 0 },
    { box: [-8, -4, 8, 20, -2, 2], uv: "rightArm", outer: "rightArmOuter", inflate: 0.28, pivot: [-6, 8, 0], motion: 1 },
    { box: [4, 8, 8, 20, -2, 2], uv: "leftArm", outer: "leftArmOuter", inflate: 0.28, pivot: [6, 8, 0], motion: -1 },
    { box: [-4, 0, 20, 32, -2, 2], uv: "rightLeg", outer: "rightLegOuter", inflate: 0.25, pivot: [-2, 20, 0], motion: -1 },
    { box: [0, 4, 20, 32, -2, 2], uv: "leftLeg", outer: "leftLegOuter", inflate: 0.25, pivot: [2, 20, 0], motion: 1 },
  ];

  const canvas = document.getElementById("overlay");
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  let width = 1;
  let height = 1;
  let dpr = 1;
  let skins = [];
  let lastFrame = 0;

  const clamp = (minimum, value, maximum) => Math.max(minimum, Math.min(value, maximum));
  const mix = (a, b, amount) => a + (b - a) * amount;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;
  }

  function loadSkin(entry) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const source = document.createElement("canvas");
        source.width = 64;
        source.height = 64;
        const sourceContext = source.getContext("2d", { willReadFrequently: true });
        sourceContext.imageSmoothingEnabled = false;
        sourceContext.clearRect(0, 0, 64, 64);
        sourceContext.drawImage(image, 0, 0, 64, 64);
        const pixels = sourceContext.getImageData(0, 0, 64, 64).data;
        resolve({ name: entry.name, pixels });
      };
      image.onerror = () => reject(new Error(`Could not load ${entry.name}`));
      image.src = entry.src;
    });
  }

  function transformPoint(point, pose) {
    let [x, y, z] = point;
    if (pose.partAngle !== 0) {
      const pivot = pose.pivot;
      const relativeY = y - pivot[1];
      const relativeZ = z - pivot[2];
      const cosine = Math.cos(pose.partAngle);
      const sine = Math.sin(pose.partAngle);
      y = pivot[1] + relativeY * cosine - relativeZ * sine;
      z = pivot[2] + relativeY * sine + relativeZ * cosine;
    }

    const yawCosine = Math.cos(pose.yaw);
    const yawSine = Math.sin(pose.yaw);
    const rotatedX = x * yawCosine + z * yawSine;
    const rotatedZ = -x * yawSine + z * yawCosine;
    const pitchCosine = Math.cos(pose.pitch);
    const pitchSine = Math.sin(pose.pitch);
    const rotatedY = y * pitchCosine - rotatedZ * pitchSine;
    const depth = y * pitchSine + rotatedZ * pitchCosine;

    return {
      x: pose.screenX + rotatedX * pose.scale,
      y: pose.screenY + rotatedY * pose.scale,
      depth,
    };
  }

  function transformNormal(normal, pose) {
    let [x, y, z] = normal;
    if (pose.partAngle !== 0) {
      const cosine = Math.cos(pose.partAngle);
      const sine = Math.sin(pose.partAngle);
      const nextY = y * cosine - z * sine;
      z = y * sine + z * cosine;
      y = nextY;
    }
    const yawCosine = Math.cos(pose.yaw);
    const yawSine = Math.sin(pose.yaw);
    const rotatedX = x * yawCosine + z * yawSine;
    const rotatedZ = -x * yawSine + z * yawCosine;
    const pitchCosine = Math.cos(pose.pitch);
    const pitchSine = Math.sin(pose.pitch);
    return {
      x: rotatedX,
      y: y * pitchCosine - rotatedZ * pitchSine,
      z: y * pitchSine + rotatedZ * pitchCosine,
    };
  }

  function faceCorners(faceName, box) {
    const [x0, x1, y0, y1, z0, z1] = box;
    switch (faceName) {
      case "front": return [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]];
      case "back": return [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]];
      case "right": return [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]];
      case "left": return [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]];
      case "top": return [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]];
      case "bottom": return [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      default: return [];
    }
  }

  function interpolateQuad(corners, u, v) {
    const top = [mix(corners[0][0], corners[1][0], u), mix(corners[0][1], corners[1][1], u), mix(corners[0][2], corners[1][2], u)];
    const bottom = [mix(corners[3][0], corners[2][0], u), mix(corners[3][1], corners[2][1], u), mix(corners[3][2], corners[2][2], u)];
    return [mix(top[0], bottom[0], v), mix(top[1], bottom[1], v), mix(top[2], bottom[2], v)];
  }

  function addTexturedBox(polygons, skin, box, uvSet, pose, characterAlpha) {
    Object.entries(uvSet).forEach(([faceName, region]) => {
      const face = FACE_DEFS[faceName];
      if (!face || transformNormal(face.normal, pose).z >= -0.001) return;

      const corners = faceCorners(faceName, box);
      const [textureX, textureY, textureWidth, textureHeight] = region;
      for (let pixelY = 0; pixelY < textureHeight; pixelY += 1) {
        for (let pixelX = 0; pixelX < textureWidth; pixelX += 1) {
          const textureIndex = ((textureY + pixelY) * 64 + textureX + pixelX) * 4;
          const sourceAlpha = skin.pixels[textureIndex + 3];
          if (sourceAlpha < 8) continue;

          const u0 = pixelX / textureWidth;
          const u1 = (pixelX + 1) / textureWidth;
          const v0 = pixelY / textureHeight;
          const v1 = (pixelY + 1) / textureHeight;
          const points = [
            transformPoint(interpolateQuad(corners, u0, v0), pose),
            transformPoint(interpolateQuad(corners, u1, v0), pose),
            transformPoint(interpolateQuad(corners, u1, v1), pose),
            transformPoint(interpolateQuad(corners, u0, v1), pose),
          ];
          const red = clamp(0, Math.round(skin.pixels[textureIndex] * face.shade), 255);
          const green = clamp(0, Math.round(skin.pixels[textureIndex + 1] * face.shade), 255);
          const blue = clamp(0, Math.round(skin.pixels[textureIndex + 2] * face.shade), 255);
          const alpha = (sourceAlpha / 255) * characterAlpha;
          polygons.push({
            points,
            depth: points.reduce((sum, point) => sum + point.depth, 0) / 4,
            color: `rgba(${red},${green},${blue},${alpha})`,
          });
        }
      }
    });
  }

  function inflatedBox(box, amount) {
    return [box[0] - amount, box[1] + amount, box[2] - amount, box[3] + amount, box[4] - amount, box[5] + amount];
  }

  function drawCharacter(skin, progress, sequence, timeline) {
    const modelHeight = clamp(CONFIG.minModelHeight, height * (CONFIG.modelHeightVh / 100), CONFIG.maxModelHeight);
    const scale = modelHeight / 34;
    const fadeIn = clamp(0, progress / 0.07, 1);
    const fadeOut = clamp(0, (1 - progress) / 0.1, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    const screenX = clamp(62, width * (CONFIG.leftOffsetVw / 100), 170);
    const travelDistance = height + modelHeight + 150;
    const screenY = height + 70 - progress * travelDistance;
    const phase = timeline * 1.15 + sequence * 1.7;
    const yaw = -0.42 + Math.sin(timeline * 0.42 + sequence) * CONFIG.swayAmount;
    const pitch = -0.12;
    const walk = Math.sin(phase) * CONFIG.walkAmount;
    const bob = Math.sin(phase * 2) * scale * 0.16;
    const polygons = [];

    PARTS.forEach((part) => {
      const pose = {
        yaw,
        pitch,
        scale,
        screenX,
        screenY: screenY + bob,
        pivot: part.pivot,
        partAngle: part.motion * walk,
      };
      addTexturedBox(polygons, skin, part.box, UV[part.uv], pose, alpha);
      addTexturedBox(polygons, skin, inflatedBox(part.box, part.inflate), UV[part.outer], pose, alpha);
    });

    polygons.sort((a, b) => b.depth - a.depth);
    polygons.forEach((polygon) => {
      const points = polygon.points;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      context.lineTo(points[1].x, points[1].y);
      context.lineTo(points[2].x, points[2].y);
      context.lineTo(points[3].x, points[3].y);
      context.closePath();
      context.fillStyle = polygon.color;
      context.fill();
      context.strokeStyle = polygon.color;
      context.lineWidth = 0.35;
      context.stroke();
    });
  }

  function render(timestamp) {
    requestAnimationFrame(render);
    const frameInterval = 1000 / CONFIG.targetFps;
    if (timestamp - lastFrame < frameInterval) return;
    lastFrame = timestamp - ((timestamp - lastFrame) % frameInterval);
    context.clearRect(0, 0, width, height);
    if (skins.length === 0) return;

    const timeline = timestamp / 1000 + CONFIG.travelSeconds * 0.57;
    const newestSequence = Math.floor(timeline / CONFIG.launchEverySeconds);
    for (let sequence = newestSequence - 5; sequence <= newestSequence; sequence += 1) {
      const age = timeline - sequence * CONFIG.launchEverySeconds;
      if (age < 0 || age > CONFIG.travelSeconds) continue;
      const skinIndex = ((sequence % skins.length) + skins.length) % skins.length;
      drawCharacter(skins[skinIndex], age / CONFIG.travelSeconds, sequence, timeline);
    }
  }

  async function start() {
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const manifest = Array.isArray(window.MINECRAFT_SKINS) ? window.MINECRAFT_SKINS : [];
    skins = (await Promise.allSettled(manifest.map(loadSkin)))
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    requestAnimationFrame(render);
  }

  start().catch((error) => console.error("Minecraft overlay failed to start:", error));
})();
