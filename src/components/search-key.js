export default {
  name: 'cl-search-key',

  componentName: 'ClSearchKey',

  inject: ['crud'],

  props: {
    // 绑定值
    value: [String, Number],
    // 选中字段
    field: {
      type: String,
      default: 'keyWord'
    },
    // 字段列表
    fieldList: {
      type: Array,
      default: () => []
    },
    // 输入框占位内容
    placeholder: {
      type: String,
      default: '请输入关键字'
    },
    // 输入框宽度
    width: {
      type: String,
      default: '250px'
    },
    // 搜索时钩子
    onSearch: Function
  },

  data() {
    return {
      field2: null,
      value2: ''
    }
  },

  watch: {
    field: {
      immediate: true,
      handler(val) {
        this.field2 = val
      }
    },

    value: {
      immediate: true,
      handler(val) {
        this.value2 = val
      }
    }
  },

  computed: {
    selectList() {
      return this.fieldList.map((e, i) => {
        return <el-option key={i} label={e.label} value={e.value} />
      })
    }
  },

  methods: {
    onKeyup({ keyCode }) {
      if (keyCode === 13) {
        this.search()
      }
    },

    search() {
      const params = {}

      this.fieldList.forEach((e) => {
        params[e.value] = null
      })

      // 搜索事件
      const next = (params2) => {
        this.crud.refresh({
          page: 1,
          ...params,
          [this.field2]: this.value2,
          ...params2
        })
      }

      if (this.onSearch) {
        this.onSearch(params, { next })
      } else {
        next()
      }
    },

    onInput(val) {
      this.$emit('input', val)
      this.$emit('change', val)
    },

    onNameChange() {
      this.$emit('field-change', this.field2)
      this.onInput('')
      this.value2 = ''
    }
  },

  render() {
    return (
			<div class="cl-search-key">
				<el-select
					class="cl-search-key__select"
					filterable
					size="mini"
					style="width: 150px"
					v-model={this.field2}
					v-show={this.selectList.length > 0}
					on-change={this.onNameChange}>
					{this.selectList}
				</el-select>

				<el-input
					class="cl-search-key__input"
					v-model={this.value2}
					placeholder={this.placeholder}
					nativeOnKeyup={this.onKeyup}
					on-input={this.onInput}
					clearable
					size="mini"
					style={{ width: this.width }}
				/>

				<el-button
					class="cl-search-key__button"
					type="primary"
					size="mini"
					on-click={this.search}>
					搜索
				</el-button>
			</div>
    )
  }
}
