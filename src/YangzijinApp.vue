<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import CampusScene from './components/CampusScene.vue'
import Icon from './components/Icon.vue'
import data from './data/campus.json'
import { getSnapshot } from './domain/simulation.js'
const base=import.meta.env.BASE_URL
const scene=ref(null),ready=ref(false),selectedId=ref(data.layout.buildings.find(b=>b.name==='昭文馆').buildingId)
const frame=ref(0),query=ref(''),category=ref('地标'),labels=ref(true),trees=ref(true),shadows=ref(true),people=ref(true),density=ref('medium'),layers=ref(false),view=ref('perspective'),playing=ref(false),modal=ref(''),notice=ref('')
let timer,toastTimer
const snapshot=computed(()=>getSnapshot(data,frame.value))
const selected=computed(()=>snapshot.value.buildings.find(b=>b.buildingId===selectedId.value))
const alarmIds=computed(()=>snapshot.value.alarms.map(b=>b.buildingId))
const filtered=computed(()=>snapshot.value.buildings.filter(b=>(!query.value?(category.value==='全部'||category.value==='地标'&&b.landmark||b.category===category.value):true)&&`${b.name} ${b.buildingId}`.includes(query.value.trim())))
const peopleCount=computed(()=>({low:10,medium:24,high:42})[density.value])
const series=computed(()=>data.frames.map(f=>f.buildings.find(b=>b.buildingId===selectedId.value).powerKw))
const chartMax=computed(()=>Math.ceil(Math.max(...series.value)*1.25/10)*10)
const chartPoints=computed(()=>series.value.map((v,i)=>`${25+i*105},${105-v/chartMax.value*85}`).join(' '))
const categories=['地标','全部','教学及配套','生活','餐饮','体育']
const icon=b=>({'图书':'book','餐饮':'food','体育':'sport','生活':'home'})[b.category]||'building'
function choose(id){selectedId.value=id;scene.value?.focusBuilding(id)}
function setView(mode){scene.value?.setView(mode)}
function stop(){clearInterval(timer);playing.value=false}
function seek(i){stop();frame.value=i}
function play(){if(playing.value)return stop();if(frame.value===2)frame.value=0;playing.value=true;timer=setInterval(()=>{frame.value++;if(frame.value===2)stop()},5000)}
function toast(t){notice.value=t;clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.value='',3500)}
function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportSnapshot(){download(JSON.stringify({campus:'扬州大学扬子津校区',notice:'运行指标均为人工模拟，非真实监测',...snapshot.value},null,2),'扬子津-模拟运行快照.json','application/json');toast('已导出当前模拟时刻')}
function screenshot(){const url=scene.value?.captureImage();if(!url)return;const a=document.createElement('a');a.href=url;a.download='扬子津-三维示意场景.png';a.click();toast('已保存三维场景，不含界面标签')}
function hidden(){if(document.hidden)stop()}
function keydown(e){if(e.key==='Escape')modal.value=''}
document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',keydown)
onBeforeUnmount(()=>{stop();clearTimeout(toastTimer);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',keydown)})
</script>

<template>
 <div class="app-shell yzu-app">
  <header class="topbar">
   <a class="brand" href="#" @click.prevent="setView('perspective')"><span class="brand-mark"><Icon name="campus" :size="28"/></span><span><strong>扬州大学 <b>扬子津</b></strong><small>校园空间与运行观察台</small></span></a>
   <div class="header-context">朗月湖畔，展开一座校园</div>
   <div class="header-actions"><span class="simulation-badge">运行数据模拟</span><button class="button" @click="modal='sources'"><Icon name="layers" :size="16"/>地图来源</button><button class="button export-button" @click="exportSnapshot"><Icon name="down" :size="16"/>导出快照</button></div>
  </header>
  <div class="navigation-row"><div class="campus-address"><span class="connection-dot"></span>扬子津校区 <span>江苏 · 扬州 · 华扬西路 196 号</span></div><div class="date-line">OSM 地图快照 <span class="date">2026 / 09 / 20</span></div></div>
  <main class="workspace">
   <aside class="left-panel">
    <div class="panel-heading"><h2>探索校园</h2><span class="count-badge">{{data.layout.buildings.length}} 栋</span></div><p class="panel-subtitle">从真实地图轮廓走进扬子津</p>
    <label class="search-box"><Icon name="search" :size="16"/><input v-model="query" placeholder="搜索楼宇、食堂、宿舍" aria-label="搜索建筑"/><button v-if="query" aria-label="清空搜索" @click="query=''">×</button></label>
    <div class="category-tabs"><button v-for="c in categories" :key="c" :class="{active:category===c}" @click="category=c">{{c}}</button></div>
    <div class="list-caption"><span>{{query?'搜索结果':category==='地标'?'校园地标':category+'建筑'}}</span><span>{{filtered.length}} 处</span></div>
    <div class="building-list"><button v-for="b in filtered" :key="b.buildingId" class="building-row" :class="{active:selectedId===b.buildingId}" :data-building="b.buildingId" @click="choose(b.buildingId)"><span class="building-icon"><Icon :name="icon(b)" :size="20"/></span><span class="building-copy"><strong>{{b.name}}</strong><small>{{b.category}}<span v-if="b.photo"> · 照片参考</span></small></span><span class="status-dot" :class="{warning:b.alarm}"></span></button><div v-if="!filtered.length" class="empty-state">没有匹配的建筑，试试“文津”或“津园”。</div></div>
    <button class="map-preview" @click="modal='map'"><img :src="base+'references/campus-map.png'" alt="用户提供的扬子津校区手绘导览图"/><span>对照手绘导览图 <Icon name="arrow" :size="15"/></span></button>
    <div class="data-source"><span class="connection-dot"></span>平面轮廓来自 OpenStreetMap</div>
   </aside>
   <section class="center-panel">
    <div class="summary-grid">
     <div class="summary-item"><span class="summary-icon"><Icon name="building" :size="20"/></span><div><span class="metric-label">GIS 建筑轮廓</span><div class="metric-value">{{data.layout.buildings.length}}<small>栋</small></div></div></div>
     <div class="summary-item"><span class="summary-icon energy"><Icon name="bolt" :size="20"/></span><div><span class="metric-label">模拟总功率</span><div class="metric-value" data-testid="total-power">{{snapshot.totalPower}}<small>kW</small></div></div></div>
     <div class="summary-item"><span class="summary-icon people"><Icon name="people" :size="20"/></span><div><span class="metric-label">模拟在楼人数</span><div class="metric-value">{{snapshot.totalOccupants.toLocaleString()}}<small>人</small></div></div></div>
     <button class="summary-item alarm-summary" :class="{warning:snapshot.alarms.length}" @click="snapshot.alarms.length?choose(snapshot.alarms[0].buildingId):toast('当前没有模拟告警，切换至 09:05 可查看演示')"><span class="summary-icon alert"><Icon name="bell" :size="20"/></span><div><span class="metric-label">模拟告警</span><div class="metric-value" data-testid="alarm-count">{{snapshot.alarms.length.toString().padStart(2,'0')}}<small>条</small></div></div></button>
    </div>
    <div class="scene-card">
     <CampusScene ref="scene" :buildings="data.layout.buildings" :selected-id="selectedId" :alarm-ids="alarmIds" :labels="labels" :trees="trees" :shadows="shadows" :people="people" :people-density="density" @select="choose" @ready="ready=true" @view-change="view=$event"/>
     <div class="scene-title"><span class="scene-kicker">扬州大学 / 扬子津校区</span><h1>津畔全景</h1><p>教学、生活与湖畔风景</p><span v-if="people" class="people-status-chip"><Icon name="people" :size="13"/>{{peopleCount}} 人 · 模拟活动</span></div>
     <div class="view-switch"><button :class="{active:view!=='top'}" @click="setView('perspective')">三维</button><button :class="{active:view==='top'}" @click="setView('top')">俯视</button></div>
     <div class="scene-toolbar"><button class="scene-tool" aria-label="回到全景" title="回到全景" @click="setView('perspective')"><Icon name="target"/></button><button class="scene-tool" aria-label="图层设置" title="图层设置" :aria-expanded="layers" @click="layers=!layers"><Icon name="layers"/></button><button class="scene-tool" aria-label="保存三维场景图片" title="保存三维场景图片" :disabled="!ready" @click="screenshot"><Icon name="camera"/></button></div>
     <div v-if="layers" class="layer-panel"><h3>场景图层</h3><label>地标名称<input v-model="labels" type="checkbox"/></label><label>校园绿化<input v-model="trees" type="checkbox"/></label><label>日照阴影<input v-model="shadows" type="checkbox"/></label><label>校园人物<input v-model="people" type="checkbox"/></label><label>人物密度<select v-model="density" aria-label="人物密度"><option value="low">低 · 10 人</option><option value="medium">中 · 24 人</option><option value="high">高 · 42 人</option></select></label><p class="motion-note">人物沿 OSM 道路与跑道活动。系统减少动态效果时暂停动画。角色为便于观察适度放大。</p></div>
     <div class="scene-hint"><Icon name="eye" :size="14"/>拖动旋转 · 滚轮缩放 · 点击楼宇</div><div class="scene-caption">OSM 平面轮廓 · 三维体量示意</div>
     <div class="scene-legend"><span><i class="legend-normal"></i>校园建筑</span><span><i class="legend-water"></i>湖泊水系</span><span><i class="legend-alarm"></i>模拟告警</span></div>
    </div>
    <section class="timeline"><div class="timeline-heading"><div><span class="timeline-dot"></span><h2>运行场景回放</h2><span class="timeline-note">模拟序列 · 每 5 秒切换</span></div><strong class="simulation-time" data-testid="simulation-time">{{snapshot.time}}</strong></div><div class="timeline-controls"><button class="play-button" :aria-label="playing?'暂停模拟':'播放模拟'" @click="play"><Icon :name="playing?'pause':'play'" :size="18"/></button><button class="replay-button" aria-label="回到起点" @click="seek(0)"><Icon name="reset" :size="18"/></button><div class="timeline-track"><span class="track-line"></span><span class="track-progress" :style="{width:frame*50+'%'}"></span><button v-for="(f,i) in data.frames" :key="i" class="time-stop" :class="{active:frame===i}" :aria-label="'切换至 '+f.simulatedAt.slice(11,16)" @click="seek(i)"><span class="time-node"></span><strong>{{f.simulatedAt.slice(11,16)}}</strong><small>{{['常态演示','文津楼温度告警','温度恢复'][i]}}</small></button></div></div></section>
   </section>
   <aside class="right-panel">
    <div class="panel-heading"><h2>建筑档案</h2><span class="detail-status" :class="{warning:selected.alarm}">{{selected.alarm?'模拟告警':'空间参考'}}</span></div>
    <button v-if="selected.photo" class="photo-cover" aria-label="查看参考照片" @click="modal='photo'"><img :src="base+'references/'+selected.photo" :alt="selected.name+'参考照片'"/><span>{{selected.name==='津园'?'用户提供 · 室内照片':'用户提供 · 建筑照片'}}<Icon name="eye" :size="14"/></span></button>
    <div v-else class="detail-cover"><Icon :name="icon(selected)" :size="65"/><div class="cover-meta"><span>OSM 建筑轮廓</span><strong>{{selected.name}}</strong></div></div>
    <div class="building-title"><div><h3 data-testid="selected-name">{{selected.name}}</h3><p>{{selected.category}} · {{selected.landmark?'校园地标':'地图建筑'}}</p></div><button class="icon-button" aria-label="定位当前建筑" @click="choose(selectedId)"><Icon name="target" :size="18"/></button></div>
    <p class="building-model-note">{{selected.note}}</p>
    <dl class="source-facts"><div><dt>模型高度</dt><dd>{{selected.size.height}} m <small>{{selected.heightSource}}</small></dd></div><div><dt>GIS 编号</dt><dd><a :href="'https://www.openstreetmap.org/'+selected.osmFeatureId" target="_blank" rel="noreferrer">{{selected.osmFeatureId}}</a></dd></div></dl>
    <div class="section-heading runtime-heading"><h3>运行指标</h3><span>全部为模拟数据</span></div><div class="detail-metrics"><div><span><Icon name="bolt" :size="16"/>当前功率</span><strong>{{selected.powerKw}}<small>kW</small></strong></div><div :class="{warning:selected.alarm}"><span><Icon name="temp" :size="16"/>代表测点温度</span><strong data-testid="selected-temperature">{{selected.temperatureC.toFixed(1)}}<small>℃</small></strong></div><div><span><Icon name="people" :size="16"/>在楼人数</span><strong>{{selected.occupants}}<small>人</small></strong></div></div>
    <section class="trend-section"><div class="section-heading"><h3>功率变化</h3><span>kW · 模拟</span></div><svg class="trend-chart" viewBox="0 0 260 140" role="img" :aria-label="selected.name+'模拟功率趋势'"><path d="M25 20H235M25 62H235M25 105H235" stroke="#dce7e9" stroke-dasharray="3 4"/><polyline :points="chartPoints" fill="none" stroke="#317d99" stroke-width="2.5"/><g v-for="(v,i) in series" :key="i"><circle :cx="25+i*105" :cy="105-v/chartMax*85" r="4" fill="#317d99"/><text :x="25+i*105" :y="95-v/chartMax*85" text-anchor="middle" class="chart-value">{{v}}</text><text :x="25+i*105" y="130" text-anchor="middle" class="chart-time">{{['09:00','09:05','09:10'][i]}}</text></g></svg></section>
    <div v-if="selected.alarm" class="building-alert warning"><Icon name="alert" :size="17"/><div><strong>文津楼模拟温度偏高</strong><p>32.4℃，达到演示阈值 32℃。</p></div></div>
    <p class="detail-disclaimer">用于校园空间展示与功能演示。建筑立面和高度为简化建模，功率、温度、人数与人员轨迹均非真实监测。</p>
    <a class="data-download" :href="base+'gis/campus.geojson'" download><Icon name="down" :size="15"/>下载校区 GeoJSON 矢量</a>
   </aside>
  </main>
  <footer class="footer"><span>扬子津校园数字孪生 Demo · GIS + 照片参考建模</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a><a :href="base+'models/campus.glb'" download><Icon name="layers" :size="14"/>下载 GLB 模型</a></footer>
  <div v-if="modal" class="modal-backdrop" @click.self="modal=''"><section class="reference-modal" role="dialog" aria-modal="true" :aria-label="modal==='sources'?'数据来源':'参考图片'"><button class="modal-close" aria-label="关闭弹窗" @click="modal=''">×</button><template v-if="modal==='sources'"><h2>地图、模型与数据来源</h2><p>下载日期：2026-09-20。平面地图使用 OpenStreetMap WGS84 数据，无需地图密钥。</p><dl class="source-facts"><div><dt>校园边界</dt><dd><a href="https://www.openstreetmap.org/way/1032915225" target="_blank" rel="noreferrer">way/1032915225</a></dd></div><div><dt>矢量要素</dt><dd>{{data.source.featureCount}} 个 / {{data.layout.buildings.length}} 个建筑轮廓</dd></div><div><dt>三维外观</dt><dd>用户提供的 5 张参考图 + 程序化近似建模</dd></div><div><dt>运行指标</dt><dd>确定性人工模拟，无设备接入</dd></div></dl><p>OSM 数据可能存在缺漏与时效差异。无名称的轮廓保留“未命名”标识；高度以 OSM 标注或估算区分。手绘导览图用于辅助理解，不作为精确定位依据。</p><div class="source-links"><a :href="base+'gis/campus.geojson'" download>下载 GeoJSON</a><a :href="base+'gis/source.osm'" download>下载原始 OSM</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">查看 ODbL 许可</a></div></template><template v-else><h2>{{modal==='map'?'扬子津校区参考导览图':selected.name+' · 参考照片'}}</h2><img class="reference-full" :src="base+'references/'+(modal==='map'?'campus-map.png':selected.photo)" alt="用户提供的校园参考图片"/><p>用户提供的参考素材；三维模型为简化示意。</p></template></section></div>
  <div v-if="notice" class="toast" role="status">{{notice}}</div>
 </div>
</template>
