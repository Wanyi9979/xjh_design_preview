# CARES 侧身探出入口素材

入口保留头部倾斜、左手挥手和右手扶边的侧身姿态；衣摆、裤腿和鞋子补齐为自然轮廓。整体向右隐藏 30px，让靠右的脚留在页面边缘后，仅露出一只脚；不使用渐隐，也不旋转或镜像成正面站立姿态。上下拖动、单次 hover 挥手与眨眼以及点击展开的行为沿用原实现。

- `public/cares-mascot-peek-full.png`：内置 `image_gen` 服务根据原侧身半身图向下补全，缩小至 512 × 768，保持透明通道。
- `public/cares-mascot-peek-repair.png`：同画布的闭眼与无挥手手臂补图，同样为 512 × 768。
- `src/App.tsx`：在统一的 SVG 画布上裁切手臂与眼睛区域，完整衣摆和鞋子保持不变。

## 侧身补全最终提示词

Use case: precise-object-edit. Input 1 is the EDIT TARGET: the existing CARES mascot leaning diagonally LEFT from the RIGHT edge, with the left open hand waving and the right fingers gripping the invisible edge. Input 2 is a STYLE REFERENCE ONLY for the black trousers and rounded yellow shoes. Extend the edit target DOWNWARD into a complete head-to-toe portrait cutout. Preserve the original tilted blue hood, face, round glasses, smile, left waving hand, white sleeve, tie, stethoscope and diagonal leaning pose as closely as possible. Complete the bottom of the white doctor's coat with a natural curved hem, then the legs in black trousers and yellow shoes, positioned on the RIGHT below the torso so the head and waving arm reach LEFT into the page. The entire character continues the SIDEWAYS PEEKING pose from Input 1, as though the body is hiding behind a vertical right edge. DO NOT straighten the torso, DO NOT make a front-facing standing pose, DO NOT center the body under the head. Portrait canvas about 2:3 with all head, hand, coat hem and shoes inside the canvas, generous transparent padding below the shoes, no cropped bottom or flat image-edge cutoff. The head remains large and tilted; natural opaque silhouette, no opacity fade. Premium 3D mascot illustration, transparent background, no actual wall, no label, no text, no border, no ground shadow, no watermark.

## 动画补图最终提示词

Use case: precise-object-edit. Edit this EXACT supplied complete side-peeking CARES mascot into a registration-matched animation repair reference. Preserve the SAME 1024x1536 canvas, all positions, scale, tilted head, blue hood, black glasses frames, smiling mouth, face shape, right hand at the far-right edge, white coat, tie, stethoscope, coat hem, bent trouser legs, yellow shoes and SIDEWAYS LEANING pose. Make ONLY two changes: 1) remove the raised waving LEFT hand and its entire white sleeve/arm at image left, reconstruct just the coat shoulder/torso behind it, keep transparent space outside the torso; 2) close both eyes naturally using soft curved eyelids behind the same glasses. Do not change anything else. DO NOT straighten or center the body. Keep full shoe outlines and clear transparent padding below them. Transparent background, clean alpha edges, absolutely no color glow, haze, external shadow, wall, text, borders, or watermark. This is a precisely aligned repair layer, not a redesign.
