# 来源与建模依据

## 公开 GIS

- 原始下载：2026-09-20。
- [OpenStreetMap API 区域数据](https://www.openstreetmap.org/api/0.6/map?bbox=119.3880,32.3395,119.4015,32.3507)
- [校园边界 way/1032915225](https://www.openstreetmap.org/way/1032915225)
- [昭文馆 way/1032897386](https://www.openstreetmap.org/way/1032897386)
- [文津楼 relation/13817766](https://www.openstreetmap.org/relation/13817766)
- [笃行楼 way/1032897464](https://www.openstreetmap.org/way/1032897464)
- [津园 way/1032897451](https://www.openstreetmap.org/way/1032897451)
- [润园 way/1032897406](https://www.openstreetmap.org/way/1032897406)
- [OpenStreetMap 许可与署名](https://www.openstreetmap.org/copyright)

原始数据保存在 `public/gis/source.osm`。下载包包含完整区域回复；展示数据在校园边界内筛选。筛选策略：建筑的顶点平均中心在校园内，其他要素至少一顶点在校园内；不是严格多边形裁切，边缘线段可能略伸出边界。关系成员先拼接闭环，再保留外环和内孔；没有闭合的面不会被强行当作面。

共导入 91 个建筑轮廓、515 个 GIS 要素。此计数不是校方公布的资产数，不保证地图没有遗漏、重叠或过时标注。

原点：119.3947065°E, 32.34511705°N。

```
x = (longitude - originLongitude) × 111319.49 × cos(originLatitude)
north = (latitude - originLatitude) × 111319.49
Three.js: (x, height, -north)
```

这是校园范围的局部米制近似，未混入百度 BD-09 或高德 GCJ-02。GeoJSON 保留原始 WGS84 经纬度。OSM 高度未标注时按类型估算；楼层数存在时用层数×3.4米估算。昭文馆42m、文津楼26m、笃行楼25m、津园13m、文体馆18m均为演示建模值，不是已核实实测高度。

## 搜索核对

- [扬子津校区 OSM 条目索引](https://mapcarta.com/W1032915225)：用于发现 OSM 校园编号；实际几何来自 OSM API。
- [扬州大学官方微博内容转载：你好，这里是华扬西路196号](https://www.sina.cn/news/detail/5072675833121488.html)：核对文津楼、昭文馆、朗月湖、润园与津园称谓。其内容日期为2024-08-29，不能代替最新测绘。
- [扬州大学信息工程学院公开 PDF](https://xxgcxy.yzu.edu.cn/__local/4/3C/2C/852CF254911D5C519F02D6B700F_A314A401_AA157.pdf?e=.pdf)：搜索定位到包含扬子津校区地理信息图的官方文档，未用于提取本项目几何。

搜索涉及 OSM、地图索引、校方公开内容和地图服务条目；最终采用可获取、可随包保留署名的 OSM 矢量，不宣称“搜索穷尽全网”。没有使用百度、高德收费接口或未经授权提取其矢量。

## 用户提供的参考图片

| 原文件 | 随包名称 | 用途 |
| --- | --- | --- |
| 微信图片_20260920084955_959_226.png | campus-map.png | 手绘导览图，辅助空间理解，不作精确测量 |
| 微信图片_20260920084956_960_226.jpg | wenjin.jpg | 文津楼入口白色架空体量参考 |
| 微信图片_20260920084958_961_226.jpg | zhaowen.jpg | 昭文馆帆形墙面、玻璃中庭参考 |
| 微信图片_20260920085000_962_226.jpg | jinyuan.jpg | 津园美食广场室内对照；不推断外立面细节 |
| 微信图片_20260920085001_963_226.jpg | duxing.jpg | 笃行楼弧形玻璃立面参考 |

完整文件存放在 `public/references/`。没有将照片伪装为 GIS 纹理贴图或摄影测量结果。所有新加立面、入口、窗格和树冠均为简化几何。人物沿选定道路折返，跑者沿东区两段 OSM 跑道弧线与连接直线循环；没有行人避障与拥挤行为模型。
