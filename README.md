# 扬州大学扬子津校区 · 三维数字孪生 Vue Demo

Vue 3 + Three.js。校园平面依据 **2026-09-20 下载的 OpenStreetMap 数据**；重点建筑结合用户提供的照片作简化建模。运行指标和人物轨迹均为模拟。

<img width="1920" height="1204" alt="image" src="https://github.com/user-attachments/assets/6cb0ebad-0376-445c-b00d-cef3c762a0c7" />

<img width="1920" height="1204" alt="image" src="https://github.com/user-attachments/assets/c02aa011-2ef8-4715-91ac-869af619cddb" />


## 快速运行

需要 Node.js 22.12+（已用 Node 24 验证）。

```bash
npm install
npm run dev
```

打开终端显示的 Local 地址。默认端口 5173；被占用时 Vite 自动选择后续可用端口。

压缩包也包含 `dist/`，安装 Node.js 后可直接双击 **start-demo.cmd**，或者运行：

```bash
npm run serve
```

此方式不依赖 node_modules，默认地址 http://127.0.0.1:4173 。不能直接双击 dist/index.html，模型需要通过 HTTP 加载。4173 已占用时在 PowerShell 中执行 `$env:PORT=4174` 后再运行 `npm run serve`。

## 已实现

- 91 个校区内 OSM 建筑轮廓，可搜索、筛选、点选、定位。
- 515 个矢量要素，涵盖道路、水体、运动场、绿地等；保留文津楼两个内院。
- 昭文馆帆形体量、文津楼入口、笃行楼弧形玻璃立面的照片参考示意。
- 津园与润园食堂；津园参考图是室内照片，所以没有据此声称复原真实外立面。
- 5 张参考图全部随包提供：导览图可放大；建筑照片在右侧同步切换。
- 三维/俯视、缩放旋转、地标标签、绿化和阴影开关、场景 PNG 下载。
- 学生、老师道路行走和东区操场慢跑；低/中/高 10/24/42 人。默认 20 名学生（含 4 名跑者）+ 4 名老师。人物为便于观察适度放大。
- 三个模拟时刻、文津楼温度告警及恢复、功率趋势、运行快照 JSON 导出。
- 校园 GeoJSON、原始 OSM、GLB 下载及 OSM 署名。
- 手机布局、系统减少动态效果适配、页面隐藏暂停。

## 数据如何区分

| 内容 | 依据 | 精度或限制 |
| --- | --- | --- |
| 校园边界 | OSM way/1032915225 | 社区矢量快照，非官方测绘界址 |
| 建筑、道路、水体、绿地 | OSM 原始 XML → GeoJSON | 未命名建筑保留“未命名”标识；数据可能有缺漏 |
| 平面坐标 | WGS84 经纬度 → 局部米制坐标 | 校园尺度的等距近似，不是测绘级转换 |
| 建筑高度 | OSM height、OSM 楼层数×3.4m，或估算 | 每栋楼在档案中标注来源；重点建筑高度也为估算 |
| 建筑外观 | 照片参考 + 程序化几何 | 简化体量，不是摄影测量、BIM 或精确立面复原 |
| 人物与运行指标 | 本地生成 | 没有真实人员跟踪、设备连接或真实用电数据 |

地图仅使用 OSM，不使用百度/高德瓦片，不需要 API Key，也没有混用 BD-09/GCJ-02 坐标。建筑数量表示 **本 Demo 导入的轮廓数**，并非学校官方建筑数量。

## 文件与再生成

```text
src/YangzijinApp.vue           界面、交互、模拟回放
src/components/CampusScene.vue WebGL、选择、相机、动画
src/scene/createYangzijin.js   基于 GIS 的模型生成
src/scene/gisPeople.js         道路与跑道人物路线
src/data/campus.json           局部几何、来源和模拟指标
public/gis/source.osm          OSM API 原始下载
public/gis/osm-ways.json        XML 中间转换结果（含关系）
public/gis/campus.geojson      WGS84 标准矢量，含 courtyard holes
public/references/             用户提供的 5 张参考图
public/models/campus.glb       可直接导入 Blender 的三维模型
scripts/extract-osm.ps1        从原始 OSM 提取节点、路径和关系
scripts/prepare-campus.mjs     校园范围筛选、投影、生成模拟数据
scripts/build-model.mjs        生成 GLB
scripts/blender_roundtrip.py   Blender 导入、保存和可选再导出
tests/campus.test.js           GIS、模型、回放、人物逻辑测试
docs/sources.md                数据来源、坐标和参考照片对应关系
docs/verification.md           验证记录
```

原始 OSM 已包含在项目中，不联网也能重新生成：

```powershell
# 仅重新提取 XML 时需要，推荐 PowerShell 7；中间 JSON 已随包提供
./scripts/extract-osm.ps1
npm run prepare:gis
npm run model
npm test
npm run build
```

调外观：编辑 `createYangzijin.js`，再运行 `npm run model`。调模拟指标：编辑 `prepare-campus.mjs` 中的 frames 生成规则，再运行 `npm run prepare:gis`。不要只改生成产物而忘记保存生成规则。

Blender 可通过「文件 → 导入 → glTF 2.0」打开 `public/models/campus.glb`。保留对象自定义属性 `buildingId`，导出时启用 Custom Properties，否则无法保持楼宇数据绑定。命令行脚本：

```bash
blender --background --factory-startup --python scripts/blender_roundtrip.py -- --export-glb
```

本次 GLB 由 Three.js 程序生成，未实际执行 Blender 导入导出；脚本仅作为后续编辑入口。

## 来源与使用范围

© OpenStreetMap contributors，地理数据库及衍生 GeoJSON 遵循 ODbL 1.0，见 https://www.openstreetmap.org/copyright 。用户照片仅作为本任务参考随包提供，未额外授予公开传播许可。更多链接见 [sources.md](docs/sources.md)。

本项目不代表扬州大学官方产品。它适合展示 GIS 到三维页面的流程；不能作为真实监控、人员定位、建筑尺寸或消防判断依据。
