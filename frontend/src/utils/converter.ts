/*
 * @Author: Chuang
 * @Date: 2025-03-04 09:17:41
 * @LastEditTime: 2025-06-12 11:06:51
 * @LastEditors: Chuang
 * @Description: 数据转换
 */

function parentExist(rows: any[], idField: string, pidValue: string) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][idField] === pidValue)
      return true
  }
  return false
}

/**
 * 将给定的行数据转换为树结构
 * @param rows 行数据数组，每个元素代表一行数据
 * @param idField 主键字段名，默认为'id'
 * @param pidField 父级主键字段名，默认为'pid'
 * @param childrenField 子节点数组字段名，默认为'children'
 * @param fields 需要复制到树节点中的额外字段名数组
 * @returns 返回转换后的树结构数组
 */
export function row2Tree(rows: any[], idField: string = 'id', pidField: string = 'pid', childrenField: string = 'children', fields: string[] = []) {
  const rootNodes: any[] = []
  rows.forEach((row) => {
    if (!parentExist(rows, idField, row[pidField])) {
      const data: any = {}
      data[idField] = row[idField]
      data[pidField] = row[pidField]
      fields.forEach((field) => {
        data[field] = row[field]
      })
      rootNodes.push(data)
    }
  })

  const queue: any[] = []
  rootNodes.forEach((rootNode) => {
    queue.push(rootNode)
  })

  while (queue.length) {
    const node = queue.shift()
    rows.forEach((row) => {
      if (row[pidField] === node[idField]) {
        const child: any = {}
        child[idField] = row[idField]
        child[pidField] = row[pidField]
        fields.forEach((field) => {
          child[field] = row[field]
        })
        if (node[childrenField]) {
          node[childrenField].push(child)
        }
        else {
          node[childrenField] = [child]
        }
        queue.push(child)
      }
    })
  }
  return rootNodes
}

/**
 * 将给定的数据转换为CSV文件并触发下载
 *
 * @param data {string} - 待转换为CSV格式的数据 例子: a,b,c,d\nd,e,f,g\n
 * @param name {string} - 下载的CSV文件的名称，如果没有提供则默认为 'data'
 *
 * 此函数首先将数据编码为CSV格式，并创建一个包含这些数据的blob对象
 * 然后它生成一个下载链接，将这个blob对象作为下载的来源，并触发点击事件来下载文件
 * 最后，为了保持页面的整洁，它会从DOM中移除这个链接
 */
export function data2Csv(data: string, name: string) {
  // “\ufeff” BOM头
  const uri = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(data)}`
  const downloadLink = document.createElement('a')
  downloadLink.href = uri
  downloadLink.download = (`${name}.csv`) || 'data.csv'
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
}

/**
 * 数字添加  千分/万 分符
 * @param num  数值
 * @param groupType 分隔类型
 * @returns
 */
export function numGroup(num: number | string, groupType: 'K' | '10K' = 'K'): string {
  num = `${num}`
  if (!num.includes('.'))
    num += '.'

  return num
    .replace(
      groupType === 'K' ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(\d{4})+\.)/g,
      ($0, $1) => {
        return `${$1},`
      },
    )
    .replace(/\.$/, '')
}
