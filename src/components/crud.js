import { deepMerge, isArray, isString, isObject, isFunction } from '@/utils'
import { bootstrap } from '@/app'
import { __inst, __crud } from '@/store'
import { Emitter } from '@/mixins'

require('@/static/index.scss')

export default {
  name: 'cl-crud',

  componentName: 'ClCrud',

  props: {
    // 别称
    name: String,
    // 是否带有边框
    border: Boolean,
    // 删除钩子 { selection, { next } }
    onDelete: Function,
    // 刷新钩子 { params, { next, done, render } }
    onRefresh: Function
  },

  mixins: [Emitter],

  provide() {
    return {
      crud: this
    }
  },

  data() {
    return {
      service: null,
      loading: false,
      selection: [],
      test: {
        refreshRd: null,
        sortLock: false,
        process: false
      },
      permission: {
        update: true,
        page: true,
        info: true,
        list: true,
        add: true,
        delete: true
      },
      params: {
        page: 1,
        size: 20
      },
      // Config data
      dict: {
        api: {
          list: 'list',
          add: 'add',
          update: 'update',
          delete: 'delete',
          info: 'info',
          page: 'page'
        },
        pagination: {
          page: 'page',
          size: 'size'
        },
        search: {
          keyWord: 'keyWord',
          query: 'query'
        },
        sort: {
          order: 'order',
          prop: 'prop'
        },
        label: {
          refresh: '刷新',
          add: '新增',
          delete: '删除',
          multiDelete: '删除',
          update: '编辑',
          refresh: '刷新',
          advSearch: '高级搜索',
          saveButtonText: '保存',
          closeButtonText: '关闭'
        }
      },
      table: {
        'context-menu': true
      },
      fn: {
        permission: null
      },
      style: {
        refreshBtn: {},
        addBtn: {},
        multiDeleteBtn: {},
        advBtn: {},
        editBtn: {},
        deleteBtn: {},
        saveBtn: {},
        closeBtn: {},
        filterSearchBtn: {}
      }
    }
  },

  created() {
    // 合并全局配置
    deepMerge(this, __crud)

    this.$on('table.selection-change', ({ selection }) => {
      this.selection = selection
    })
  },

  mounted() {
    const res = bootstrap(this)

    // Loaded
    this.$emit('load', res)

    // 绑定自定义事件
    this.bindEvent(res)

    // 窗口事件
    window.removeEventListener('resize', function() { })
    window.addEventListener('resize', () => {
      this.doLayout()
    })
  },

  methods: {
    // 获取权限
    getPermission(key) {
      if (!key) {
        return this.permission
      }

      switch (key) {
        case 'edit':
        case 'update':
          return this.permission.update
        default:
          return this.permission[key]
      }
    },

    // 获取参数
    getParams() {
      return this.params
    },

    // 绑定自定义事件
    bindEvent(res) {
      for (const i in __crud.event) {
        const event = __crud.event[i]
        let mode = null
        let callback = null

        if (isObject(event)) {
          mode = event.mode
          callback = event.callback
        } else {
          mode = 'on'
          callback = event
        }

        if (!['on', 'once'].includes(mode)) {
          return console.error(i, 'mode must be (on / once)')
        }

        if (!isFunction(callback)) {
          return console.error(i, 'callback is not a function')
        }

        __inst[`$${mode}`](i, (data) => {
          callback(data, res)
        })
      }
    },

    // 新增
    rowAdd() {
      this.broadcast('cl-upsert', 'crud.add')
    },

    // 编辑
    rowEdit(data) {
      this.broadcast('cl-upsert', 'crud.edit', data)
    },

    // 追加
    rowAppend(data) {
      this.broadcast('cl-upsert', 'crud.append', data)
    },

    // 关闭
    rowClose() {
      this.broadcast('cl-upsert', 'crud.close')
    },

    // 删除
    rowDelete(...selection) {
      // 获取请求方法
      const reqName = this.dict.api.delete

      const params = {
        ids: selection.map((e) => e.id)
      }

      // 删除事件
      const next = (params) => {
        return new Promise((resolve, reject) => {
          this.$confirm('此操作将永久删除选中数据，是否继续？', '提示', {
            type: 'warning'
          })
            .then((res) => {
              if (res === 'confirm') {
                // Validate
                if (!this.service[reqName]) {
                  return reject(`Request function '${reqName}' is not fount`)
                }

                // Send request
                this.service[reqName](params)
                  .then((res) => {
                    this.$message.success('删除成功')
                    this.refresh()
                    resolve(res)
                  })
                  .catch((err) => {
                    this.$message.error(err)
                    reject(err)
                  })
              }
            })
            .catch(() => null)
        })
      }

      if (this.onDelete) {
        this.onDelete(selection, { next })
      } else {
        next(params)
      }
    },

    // 批量删除
    deleteMulti() {
      this.rowDelete.apply(this, this.selection || [])
    },

    // 打开高级搜索
    openAdvSearch() {
      this.broadcast('cl-adv-search', 'crud.open')
    },

    // 关闭高级搜素
    closeAdvSearch() {
      this.broadcast('cl-adv-search', 'crud.close')
    },

    // 替换参数值
    paramsReplace(params) {
      const { pagination, search, sort } = this.dict
      const a = { ...params }
      const b = { ...pagination, ...search, ...sort }

      for (const i in b) {
        if (a.hasOwnProperty(i)) {
          if (i != b[i]) {
            a[`_${b[i]}`] = a[i]

            delete a[i]
          }
        }
      }

      for (const i in a) {
        if (i[0] === '_') {
          a[i.substr(1)] = a[i]

          delete a[i]
        }
      }

      return a
    },

    // 刷新请求
    refresh(newParams = {}) {
      // 设置参数
      const params = this.paramsReplace(Object.assign(this.params, newParams))

      // Loading
      this.loading = true

      // 预防脏数据
      const rd = (this.test.refreshRd = Math.random())

      // 完成事件
      const done = () => {
        this.loading = false
      }

      // 渲染
      const render = (list, pagination) => {
        this.broadcast('cl-table', 'crud.refresh', { list })
        this.broadcast('cl-pagination', 'crud.refresh', pagination)
        done()
      }

      // 请求执行
      const next = (params) => {
        return new Promise((resolve, reject) => {
          const reqName = this.dict.api.page

          if (!this.service[reqName]) {
            done()
            return reject(`Request function '${reqName}' is not fount`)
          }

          this.service[reqName](params)
            .then((res) => {
              if (rd != this.test.refreshRd) {
                return false
              }

              if (isString(res)) {
                return reject('Response error')
              }

              if (isArray(res)) {
                render(res)
              } else if (isObject(res)) {
                render(res.list, res.pagination)
              }

              resolve(res)
            })
            .catch((err) => {
              this.$message.error(err)
              reject(err)
            })
            .done(() => {
              done()
              this.test.sortLock = true
            })
        })
      }

      if (this.onRefresh) {
        return this.onRefresh(params, { next, done, render })
      } else {
        return next(params)
      }
    },

    // 重新渲染布局
    doLayout() {
      this.broadcast('cl-table', 'resize')
    },

    // 完成渲染
    done() {
      this.test.process = true
    }
  },

  render() {
    return <div class={['cl-crud', { 'is-border': this.border }]}>{this.$slots.default}</div>
  }
}
