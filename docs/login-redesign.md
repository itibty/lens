# Lens 登录页设计稿

当前登录页是「浅蓝插画 + 右侧表单」的卡片结构，偏轻快，不够大气。下面 10 张是**只出图、未改代码**的方向稿，方便先选风格再落地。

图都在 [`design-previews/login/`](design-previews/login/)。

## 01 暗夜观测台

深色指挥舱。玻璃拟态表单居中，背景是星图、走势和节点，偏「看数据宇宙」。

![01 暗夜观测台](design-previews/login/login-01-dark-observatory.png)

## 02 电影级分屏

左 6 成城市暮色 + 悬浮 KPI，右 4 成象牙色表单。最接近现在的左右结构，但尺度拉大。

![02 电影级分屏](design-previews/login/login-02-cinematic-split.png)

## 03 极光玻璃

全屏靛蓝–青绿极光，右侧磨砂玻璃卡，左侧大字「Lens / 为决策留下光」。

![03 极光玻璃](design-previews/login/login-03-aurora-glass.png)

## 04 克莱因蓝美术馆

整墙 Klein Blue，左侧超大字标，右侧白石板表单。最克制、最有海报感。

![04 克莱因蓝美术馆](design-previews/login/login-04-klein-gallery.png)

## 05 建筑暮色

落地玻璃幕墙蓝调时刻，左侧通高暗玻璃门当作登录区。到总部上班的感觉。

![05 建筑暮色](design-previews/login/login-05-architecture-dusk.png)

## 06 暖金机构

胡桃木 + 香槟卡 + 黄铜描边。更像投行/咨询会客室，不走科技风。

![06 暖金机构](design-previews/login/login-06-warm-institution.png)

## 07 巨字英雄

浅灰底上巨大线描 L，字里藏等高线和柱状图。瑞士海报式，留白最多。

![07 巨字英雄](design-previews/login/login-07-monumental-type.png)

## 08 黎明地平线

晨光、远山、一线城市剪影。居中白卡，语气是「新的一天，从看清开始」。

![08 黎明地平线](design-previews/login/login-08-dawn-horizon.png)

## 09 黑曜金

黑石地面、金地平线、金属双钻标。私密决策中枢，最贵、也最跳出现有蓝绿。

![09 黑曜金](design-previews/login/login-09-obsidian-gold.png)

## 10 数据星河

星系粒子流 + 漂浮经营指标。表单偏左，右侧留给宇宙。最「BI 仪式感」。

![10 数据星河](design-previews/login/login-10-data-galaxy.png)

## 怎么选

| 你更在意 | 先看 |
| --- | --- |
| 还想保留左右分栏 | 02、05、07 |
| 要深色、科技、大气 | 01、03、10 |
| 要极简、品牌感强 | 04、07 |
| 要暖、稳、高端机构 | 06、09 |
| 要明亮、轻、一天的开始 | 08 |

选中编号后，再改 `frontend/src/views/login/index.vue` 落地即可。
