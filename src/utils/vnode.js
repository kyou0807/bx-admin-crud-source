import { isFunction, isString, cloneDeep, isObject } from './index'
import { __inst, __vue } from '@/store'

/**
 * Parse JSX, filter params
 * @param {*} vnode
 * @param {{scope,prop,children}} options
 */
// eslint-disable-next-line camelcase
const parse_jsx = (vnode, options = {}) => {
  const { scope, prop, $scopedSlots, children = [], on, ref } = options
  const h = __inst.$createElement

  if (vnode.name.indexOf('slot-') === 0) {
    const rn = $scopedSlots[vnode.name]

    if (rn) {
      return rn({ scope })
    } else {
      return <cl-error-message title={`组件渲染失败，未找到插槽：${vnode.name}`} />
    }
  }

  if (vnode.render) {
    if (!__inst.$root.$options.components[vnode.name]) {
      __vue.component(vnode.name, cloneDeep(vnode))
    }

    // Avoid props prompts { type:null }
    delete vnode.props
  }

  const keys = [
    'class',
    'style',
    'props',
    'attrs',
    'domProps',
    'on',
    'nativeOn',
    'directives',
    'scopedSlots',
    'slot',
    'key',
    'ref',
    'refInFor'
  ]

  // Avoid loop update
  const data = cloneDeep(vnode)

  for (const i in data) {
    if (!keys.includes(i)) {
      delete data[i]
    }
  }

  if (scope) {
    if (!data.attrs) {
      data.attrs = {}
    }

    if (!data.on) {
      data.on = on
    }

    if (!data.props) {
      data.props = {}
    }

    // 添加作用域
    data.props.scope = scope

    // 添加自定义class
    if (data.props.class) {
      data.class = data.props.class
    }

    // 输入事件
    const onInput = data.on.input

    // 设置默认值
    data.attrs.value = scope[prop]
    // 监听输入事件
    data.on.input = val => {
      __inst.$set(scope, prop, val)
      if (onInput) {
        onInput(val)
      }
    }
  }
  data.ref = ref
  // 如果当前是复选框组件, 判断value是否为数组,如果是undefined,则设置为[]
  if (vnode.name === 'el-checkbox-group' && data.attrs.value === undefined) {
    data.attrs.value = []
  }
  return h(vnode.name, cloneDeep(data), children)


}

/**
 * Render vNode
 * @param {*} vnode
 * @param {*} options
 */
export function renderNode(vnode, { prop, scope, $scopedSlots, on, ref }) {
  const h = __inst.$createElement

  if (!vnode) {
    return null
  }

  // When slot or tagName
  if (isString(vnode)) {
    return parse_jsx({ name: vnode }, { scope, $scopedSlots, on, ref })
  }

  // When customeize render function
  if (isFunction(vnode)) {
    return vnode({ scope, h })
  }

  // When jsx
  if (isObject(vnode)) {
    if (vnode.context) {
      return vnode
    }

    if (vnode.name) {
      // Handle general component
      const keys = ['el-select', 'el-radio-group', 'el-checkbox-group']

      if (keys.includes(vnode.name)) {
        // Append component children
        const children = (vnode.options || []).map((e, i) => {
          if (vnode.name === 'el-select') {
            let label, value

            if (isString(e)) {
              label = value = e
            } else if (isObject(e)) {
              label = e.label
              value = e.value
            } else {
              return <cl-error-message title={'组件渲染失败，options 参数错误'} />
            }

            return (
              <el-option
                {...{
                  props: {
                    key: i,
                    label,
                    value,
                    ...e.props
                  }
                }}
              />
            )
          } else if (vnode.name === 'el-radio-group') {
            return (
              <el-radio
                {...{
                  props: {
                    key: i,
                    label: e.value,
                    ...e.props
                  }
                }}>
                {e.label}
              </el-radio>
            )
          } else if (vnode.name === 'el-checkbox-group') {
            return (
              <el-checkbox
                {...{
                  props: {
                    key: i,
                    label: e.value,
                    ...e.props

                  }
                }}>
                {e.label}
              </el-checkbox>
            )

          } else {
            return null
          }
        })
        return parse_jsx(vnode, { prop, scope, children, on, ref })
      } else {
        return parse_jsx(vnode, { prop, scope, $scopedSlots, on, ref })
      }
    } else {
      return <cl-error-message title={'组件渲染失败，组件 name 不能为空'} />
    }
  }
}
