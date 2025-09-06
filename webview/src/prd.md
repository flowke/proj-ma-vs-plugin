* 关于Repo 组件
  * 我希望能跟 Bookmarks 组件内一样, 支持分类和拖拽
  * 你看看是不是可以抽离组件, 共用拖拽逻辑, 抽离到components 文件夹
  * 分类header title 也跟Bookmarks 组件内一样, 支持新增, 重命名, 删除

* 关于 仓库的解析: 
  * 我会给出一个访问地址, 比如: https://github.com/flowke/Linux101-docs
    * 你需要基于这个地址(可能是github的, 也可能是gitlab的), 解析处仓库的 克隆地址: 比如
      * https://github.com/flowke/Linux101-docs.git
      * git@github.com:flowke/Linux101-docs.git
      * 这两个地址不需要展示, 记住就行. 
    * 我可能会给gitlab, gitbug的都可能
      * 你现在已经解析出仓库图标, 名字, 仓库标签, 这很好, 可以保留
    * 右边不需要目前的图标, 把相关功能通过 MoreDropdown 组件来实现, 
      * MoreDropdown的功能支持:
        * clone:https, clone:ssh, 复制链接, 重新解析, 删除
        * 其中点击clone相关功能, 可以选择home中已经存在的父文件夹, 选择后, 自动clone到对应的文件夹中, clone完成后, 自动刷新对应的父目录, 如果home中还不存在对应的父文件夹, 则先自动打开资源管理器, 选择一个父文件夹, 此时home就新增了一个父文件夹, 之后继续clone操作