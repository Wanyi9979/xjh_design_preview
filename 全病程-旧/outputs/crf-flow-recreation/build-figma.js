const regular={family:'Noto Sans SC',style:'Regular'}, bold={family:'Noto Sans SC',style:'Bold'};
await Promise.all([figma.loadFontAsync(regular),figma.loadFontAsync(bold)]);
const ids=[];
const C={ink:'#171C20',muted:'#59636F',blue:'#73AFFF',green:'#61CC7A',purple:'#A294ED',teal:'#48CBCB',orange:'#FF9439',line:'#838B91'};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const paint=h=>[{type:'SOLID',color:rgb(h)}];
function grad(a,b){return [{type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:[{position:0,color:{...rgb(a),a:1}},{position:1,color:{...rgb(b),a:1}}]}]}
function track(n){ids.push(n.id);return n}
let maxX=Math.max(0,...figma.currentPage.children.map(n=>n.x+n.width));
const root=track(figma.createFrame());root.name='临床研究数据采集与CRF录入链路流程 / 截图原样可编辑版';root.resize(2048,1018);root.x=maxX+200;root.y=80;root.fills=paint('#FFFFFF');root.clipsContent=false;
function box(p,name,x,y,w,h,fill,stroke,r=14){let n=track(figma.createRectangle());p.appendChild(n);n.name=name;n.x=x;n.y=y;n.resize(w,h);n.cornerRadius=r;n.fills=fill?paint(fill):[];n.strokes=stroke?paint(stroke):[];n.strokeWeight=1.6;return n}
function txt(p,s,x,y,w,size=18,weight=false,color=C.ink,align='LEFT',lh=1.4){let t=track(figma.createText());p.appendChild(t);t.name=s.replace(/\n/g,' / ');t.fontName=weight?bold:regular;t.fontSize=size;t.lineHeight={unit:'PIXELS',value:size*lh};t.fills=paint(color);t.textAutoResize='HEIGHT';t.resize(w,40);t.characters=s;t.textAlignHorizontal=align;t.x=x;t.y=y;return t}
function auto(p,name,x,y,w,h,fill,stroke,pad=0,gap=0){let f=track(figma.createAutoLayout('VERTICAL'));p.appendChild(f);f.name=name;f.resize(w,h);f.layoutSizingHorizontal='FIXED';f.layoutSizingVertical='FIXED';f.x=x;f.y=y;f.paddingLeft=pad;f.paddingRight=pad;f.paddingTop=pad;f.paddingBottom=pad;f.itemSpacing=gap;f.fills=fill?paint(fill):[];f.strokes=stroke?paint(stroke):[];f.cornerRadius=14;f.clipsContent=false;return f}
function stack(p,name,x,y,w,items,size=16,gap=12,color=C.ink){let f=auto(p,name,x,y,w,40,null,null,0,gap);for(let s of items)txt(f,s,0,0,w,size,false,color,'LEFT',1.4);f.layoutSizingVertical='HUG';return f}
function path(p,name,d,fill,stroke,sw=2){let v=track(figma.createVector());p.appendChild(v);v.name=name;v.vectorPaths=[{windingRule:'NONZERO',data:d}];v.fills=fill?paint(fill):[];v.strokes=stroke?paint(stroke):[];v.strokeWeight=sw;v.strokeJoin='ROUND';v.strokeCap='ROUND';return v}
function arrow(name,pts,color=C.line,head=true){let d=pts.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');path(root,name,d,null,color,2.2);if(head){let [x,y]=pts[pts.length-1], [a,b]=pts[pts.length-2];let theta=Math.atan2(y-b,x-a),l=9,s=4.4;let bx=x-l*Math.cos(theta),by=y-l*Math.sin(theta);path(root,name+' / 箭头',`M${x} ${y} L${bx-s*Math.sin(theta)} ${by+s*Math.cos(theta)} L${bx+s*Math.sin(theta)} ${by-s*Math.cos(theta)} Z`,color,null);}}
function label(s,x,y,orange=false){box(root,'分支 / '+s,x,y,29,27,orange?'#FFA14D':'#E9ECEF',null,4);txt(root,s,x,y+1,29,17,true,orange?'#FFFFFF':'#626B73','CENTER',1.4)}
const svgParts={
 doc:'<path d="M7 2h15l9 9v25a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="currentColor"/><path d="M22 3v9h8M11 17h6M11 23h14M11 29h14" stroke="white" stroke-width="2.7" fill="none" stroke-linecap="round"/>',
 outlineDoc:'<path d="M7 3h16l8 8v25H7Z M23 3v9h8M12 18h13M12 24h13M12 30h9" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>',
 database:'<path d="M5 11v19c0 5 30 5 30 0V11" fill="currentColor"/><ellipse cx="20" cy="10" rx="15" ry="7" fill="currentColor" stroke="white" stroke-width="1.4"/><path d="M5 19c0 9 30 9 30 0M5 28c0 9 30 9 30 0" fill="none" stroke="white" stroke-width="1.8"/>',
 hospital:'<path d="M3 37V13h9V4h13v9h11v24H3Z" stroke="currentColor" stroke-width="3" fill="none"/><path d="M17 8h4m-4 6h4m-4 6h4M7 18h2m-2 6h2m-2 6h2m20-12h2m-2 6h2m-2 6h2M16 37v-9h7v9" stroke="currentColor" stroke-width="3"/>',
 home:'<path d="M2 19 20 3 38 19l-4 4-3-3v17H23V26h-7v11H7V20l-2 3Z" fill="currentColor"/><path d="M28 5h6v12l-6-5Z" fill="currentColor"/>',
 person:'<circle cx="20" cy="10" r="8" fill="currentColor"/><path d="M5 36v-5c0-10 30-10 30 0v5H5Z" fill="currentColor"/><path d="m18 20-3 16h10l-4-16" fill="white" opacity=".85"/>',
 doctor:'<circle cx="20" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="4"/><path d="M6 34v-7c0-10 28-10 28 0v7c-6 4-22 4-28 0ZM16 18v10m8-10v10m-8 0a4 4 0 0 0 8 0m-4 4v4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="28" r="3" fill="white" stroke="currentColor" stroke-width="2"/>',
 layers:'<path d="M3 12 20 3 37 12 20 22Z" fill="currentColor"/><path d="m3 20 17 10 17-10M3 28l17 10 17-10" stroke="currentColor" stroke-width="4" fill="none" stroke-linejoin="round"/>',
 image:'<rect x="4" y="5" width="32" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="14" cy="14" r="3" fill="currentColor"/><path d="m6 31 10-12 7 8 6-6 6 10Z" fill="currentColor"/>',
 pencil:'<path d="m5 28 22-22 7 7-22 22-9 3Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="m23 10 7 7M5 28l7 7" stroke="currentColor" stroke-width="3"/>',
 check:'<path d="m7 21 8 8L33 8" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'};
function icon(p,type,x,y,size,color){let n=figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">${svgParts[type].replace(/currentColor/g,color)}</svg>`);p.appendChild(n);n.name='图标 / '+type;n.x=x;n.y=y;ids.push(n.id,...n.findAll(()=>true).map(v=>v.id));return n}
// The five stage lanes retain the source positions and proportions.
box(root,'01 / 方案定义分区',4,200,240,793,'#F8FBFF','#E6F0FF',18);
box(root,'02 / 数据采集分区',259,200,522,793,'#F8FDFE','#E5F4F6',18);
box(root,'03 / 源数据处理分区',796,200,596,793,'#FCFBFF','#EFEBFC',18);
box(root,'04 / CRF生成与核对分区',1407,200,363,793,'#FDFEFF','#F0F4FA',18);
box(root,'05 / 数据提交分区',1784,200,260,793,'#FBFEFC','#EAF6ED',18);
const heading=auto(root,'标题与说明',20,8,1700,90,null,null,0,7);
txt(heading,'临床研究数据采集与CRF录入链路流程',0,0,1700,40,true,'#153D70','LEFT',1.3);
txt(heading,'基于研究方案要求，完成院内外数据采集、源数据处理、CRF生成与EDC提交的全流程',0,0,1700,20,false,C.muted,'LEFT',1.4);
function stage(x,w,num,title,a,b,c,first=false){let left=first?`M${x} 124`:`M${x} 124 L${x+26} 155 L${x} 186`;let d=first?`M${x+6} 124 L${x+w-30} 124 L${x+w} 155 L${x+w-30} 186 L${x+6} 186 Q${x} 186 ${x} 180 L${x} 130 Q${x} 124 ${x+6} 124 Z`:`M${x} 124 L${x+w-30} 124 L${x+w} 155 L${x+w-30} 186 L${x} 186 L${x+26} 155 Z`;let v=path(root,num+' / '+title,d,a,null);v.fills=grad(a,b);let e=track(figma.createEllipse());root.appendChild(e);e.name=num+' / 序号背景';e.resize(42,42);e.x=x+(first?28:39);e.y=134;e.fills=grad(c,b);txt(root,num,e.x,140,42,22,true,'#FFFFFF','CENTER',1.25);txt(root,title,e.x+55,137,w-110,26,true,num==='03'?'#30316E':num==='05'?'#195326':'#173C64','LEFT',1.4)}
stage(2,256,'01','方案定义','#EAF3FF','#CCE2FF','#65A5F8',true);
stage(256,543,'02','数据采集','#DFF8F2','#D1F3EC','#49C7BC');
stage(796,608,'03','源数据处理','#F0EDFF','#E0DBFC','#9385E4');
stage(1402,380,'04','CRF生成与核对','#DCEBFF','#CBE1FF','#63A1F4');
stage(1779,265,'05','数据提交','#DBF6DF','#C9F0CD','#2CC560');
// Source connections, including the decision and correction loops.
arrow('方案配置 → 数据采集',[[232,551],[259,551]]);
arrow('院内采集 → 源数据归集',[[554,334],[574,334],[582,342],[582,551],[608,551]]);
arrow('院外采集 → 源数据归集',[[554,603],[574,603],[582,595],[582,551],[608,551]]);
arrow('已有数据 → 源数据归集',[[554,830],[574,830],[582,822],[582,551],[608,551]]);
arrow('归集 → 源数据处理',[[765,551],[795,551]]);
arrow('源数据处理 → 医学判断决策',[[797,354],[847,354]]);
arrow('需要医学判断 → 确认',[[939,421],[939,478]]);
arrow('确认 → CRF数据决策',[[939,665],[939,711]]);
arrow('无需医学判断 → 结构化',[[1030,354],[1087,354],[1098,345],[1098,317],[1104,310],[1125,310]]);
arrow('无需医学判断 → 非结构化',[[1066,354],[1090,354],[1098,362],[1098,618],[1125,618]]);
arrow('形成CRF数据 → 数据处理',[[1015,772],[1088,772],[1098,763],[1098,415],[1125,415]]);
arrow('不形成CRF数据 → 保留源数据',[[863,772],[825,772],[817,779],[817,824],[823,831],[852,831],[860,839],[860,854]]);
arrow('分类处理 → CRF字段映射',[[1408,275],[1468,275]]);
arrow('分类处理 → 核对阶段',[[1379,551],[1407,551]]);
arrow('字段映射 → CRF草稿',[[1591,333],[1591,372]]);
arrow('CRF草稿 → CRC核对',[[1591,438],[1591,476]]);
arrow('CRC核对 → 完整性决策',[[1591,632],[1591,673]]);
arrow('核对未通过 → 修正',[[1591,792],[1591,844]],C.orange);
arrow('修正循环',[[1470,910],[1435,910],[1427,903],[1427,559],[1435,551],[1468,551]],C.orange);
arrow('修正回路 → 修正卡片',[[1427,910],[1468,910]],C.orange);
arrow('核对通过 → EDC提交',[[1667,733],[1746,733],[1754,725],[1754,559],[1762,551],[1784,551]]);
// 01: protocol configuration.
box(root,'临床研究方案 / EDC项目配置',20,284,212,444,'#F5FAFF','#D7E8FF');
icon(root,'doc',98,315,62,C.blue);
txt(root,'临床研究方案 /\nEDC项目配置',40,396,172,21,true,C.ink,'CENTER',1.4);
stack(root,'方案配置要素',40,503,180,['•  项目与中心','•  访视与时间点','•  CRF表单及字段','•  数据采集要求\n   （采集项、方式、\n    是否需医学判断）'],17,17);
// 02: collection source cards.
function collection(name,x,y,w,h,fill,color,type,items){box(root,name,x,y,w,h,fill,null);icon(root,type,x+23,y+15,35,color);txt(root,name,x+73,y+19,w-90,20,true);let list=auto(root,name+' / 采集方式',x+20,y+65,w-40,h-80,null,null,0,11);for(let s of items){let pill=auto(list,s,0,0,w-40,40,null,color,0,0);pill.cornerRadius=18;pill.primaryAxisAlignItems='CENTER';pill.counterAxisAlignItems='CENTER';pill.strokeWeight=1.2;txt(pill,s,0,0,w-50,14.5,true,C.ink,'CENTER',1.4)}}
collection('院内数据采集',273,222,281,224,'#EAF9ED','#A7E8B5','hospital',['院内系统获取（HIS/LIS/PACS）','CRC人工录入 / 上传报告','患者电子问卷（院内填写）']);
collection('院外数据采集',273,468,281,279,'#EBF3FF','#90BFFF','home',['患者ePRO问卷','患者eDiary监测数据','患者上传外院报告','CRC随访补充记录']);
collection('全病程已有数据',273,770,281,127,'#E0F9F9','#81DEE2','database',['引用既往病历、检验检查等资料']);
box(root,'参与者源数据归集',609,419,156,256,'#F0EEFF','#DAD5FC');icon(root,'database',657,445,60,C.purple);txt(root,'参与者\n源数据归集',620,516,134,20,true,C.ink,'CENTER',1.4);txt(root,'院内 / 院外 /\n已有数据',624,594,126,16,false,C.ink,'CENTER',1.5);
// 03: medical decisions.
function diamond(name,cx,cy,w,h,s,size=18){let n=path(root,name,`M${cx} ${cy-h/2} L${cx+w/2} ${cy} L${cx} ${cy+h/2} L${cx-w/2} ${cy} Z`,'#FFF4D7','#FFBF42',1.8);txt(root,s,cx-w*.38,cy-(s.split('\n').length*size*1.3)/2,w*.76,size,true,C.ink,'CENTER',1.3);return n}
diamond('是否需要医学判断或研究者确认',939,353,182,136,'是否需要\n医学判断或\n研究者确认？',17.5);
box(root,'医学判断 / 研究者确认',808,479,262,186,'#FFF7EC','#FFF0D9');icon(root,'doctor',920,489,37,C.orange);box(root,'医学判断标题背景',824,541,231,38,'#FFE5C6',null,11);icon(root,'doctor',823,544,27,'#FFB264');txt(root,'医学判断 / 研究者确认',843,543,210,19,true,C.ink,'CENTER');stack(root,'医学判断内容',823,591,235,['•  医学评估（如AE判定、疾病进展等）','•  确认是否形成CRF数据'],13.5,8);
diamond('是否形成CRF数据',939,772,152,116,'是否形成\nCRF数据？',17.5);
box(root,'保留源数据及评估记录',777,854,162,84,'#F0F1F3','#D6DAE0',12);icon(root,'outlineDoc',843,837,31,'#939CA5');icon(root,'outlineDoc',788,882,30,'#939CA5');txt(root,'保留源数据\n及评估记录',820,874,109,18,true,C.ink,'CENTER',1.35);
box(root,'数据分类处理',1125,222,253,488,'#F2F0FF',null,14);txt(root,'数据分类处理',1141,239,221,20,true,C.ink,'CENTER');
box(root,'结构化数据',1139,284,224,201,'#E9F2FF','#C9DFFF',13);box(root,'结构化数据标题底',1139,284,224,53,'#DFECFF',null,13);icon(root,'outlineDoc',1151,299,30,C.blue);txt(root,'结构化数据',1192,300,166,20,true);stack(root,'结构化数据类型',1156,349,201,['•  ePRO / eDiary','•  人工录入数据','•  系统结构化数据','•  字段标准化、按规则映射'],14.5,11);
box(root,'非结构化数据',1139,512,224,178,'#F0EDFF','#CBC2F4',13);box(root,'非结构化数据标题底',1139,512,224,54,'#E9E3FD',null,13);icon(root,'image',1151,528,30,C.purple);txt(root,'非结构化数据',1192,529,167,20,true);stack(root,'非结构化数据类型',1156,581,201,['•  图片 / PDF / 检验检查报告','•  病历 / 外院资料','•  OCR / AI识别、结构化提取'],14,13);
label('否',1044,341);label('是',924,433,true);label('是',1042,758);label('否',802,786);
// 04: CRF generation and review.
box(root,'CRF字段映射',1470,216,242,117,'#F0F6FF','#E6F0FF',13);icon(root,'layers',1493,230,32,'#95C4FF');txt(root,'CRF字段映射',1538,231,166,20,true);txt(root,'匹配项目、参与者、\n访视、CRF及字段',1514,271,182,16,false,C.ink,'LEFT',1.5);
box(root,'生成CRF草稿',1470,374,242,64,'#F1F6FF','#E7F0FE',13);icon(root,'outlineDoc',1493,390,32,'#91BDFA');txt(root,'生成CRF草稿',1538,391,163,20,true);
box(root,'CRC核对确认',1470,479,242,153,'#F0F6FF','#E6F0FF',13);icon(root,'person',1493,493,32,C.blue);txt(root,'CRC核对确认',1538,495,165,20,true);stack(root,'CRC核对内容',1501,539,197,['•  核对源数据与识别结果','•  检查CRF预填值的\n   准确性与完整性'],16,6);
diamond('数据是否正确完整',1591,733,152,116,'数据是否\n正确、完整？',17);
box(root,'修正数据',1470,845,242,129,'#FFF3E5','#FFEAD0',13);icon(root,'pencil',1493,859,32,C.orange);txt(root,'修正数据',1548,860,146,20,true);stack(root,'数据修正内容',1520,907,184,['•  核实并更正源数据','•  调整CRF草稿'],15,8);
label('否',1577,803,true);label('是',1698,719);label('是',1741,684);
// 05: submission.
box(root,'提交并同步至EDC',1797,340,231,393,'#EFFBEF','#CBEFCF',14);icon(root,'database',1879,371,65,C.green);txt(root,'提交并同步至\nEDC',1815,456,195,21,true,C.ink,'CENTER',1.4);path(root,'提交卡片分隔线','M1812 536 L2014 536',null,'#E5F4E8',1);
[['形成研究CRF数据',560],['保留数据来源与修改记录',607],['支持审计追踪与数据质疑',654]].forEach(([s,y])=>{icon(root,'check',1810,y+3,20,'#40BE63');txt(root,s,1833,y,185,15.5,false,C.ink,'LEFT',1.4)});
root.rescale(2302/2048);root.resize(2302,1144);root.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:1}},{format:'SVG',svgOutlineText:false}];
figma.viewport.scrollAndZoomIntoView([root]);
return {rootNodeId:root.id,createdNodeIds:ids,textNodes:root.findAllWithCriteria({types:['TEXT']}).length,totalLayers:ids.length,width:root.width,height:root.height,url:'https://www.figma.com/design/FgouomuGR94MfnoOIssFJG?node-id='+root.id.replace(':','-')};
