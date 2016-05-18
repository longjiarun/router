/**
 * # Router
 *
 * 路由控制
 *
 */

/**
 * ## Router Constructor
 *
 * Router 类
 *
 * 使用方法：
 * ```js
 * var router = new Router({
 *     //默认路由
 *     defaultRoute:'/',
 *     //路由列表
 *     routes:{
 *          'add': function(){
 *          },
 *          'detail/:id':function(id){
 *              //可获取到id参数
 *              console.log(id)
 *          }
 *     }
 * })
 * ```
 */

!(function() {
    var optionalParam = /\((.*?)\)/g,
        namedParam = /(\(\?)?:\w+/g,
        splatParam = /\*\w+/g,
        escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g,
        hashRegExp = /#(.*)$/

    var _window = window,
        _location = _window.location,
        _history = _window.history

    //('onhashchange' in _window)
    var POPSTATE_EVENT = 'popstate',
        CHANGE_EVENT = _history.replaceState ? POPSTATE_EVENT : 'hashchange'

    var extend = function(target,source){
        for(var name in source){
            source.hasOwnProperty(name) && source[name] !== undefined && (target[name] = source[name])
        }

        return target
    }

    function Router(options) {
        this.options = extend({
            defaultRoute: '/',
            routes: {},
            beforeRouteChange: null
        }, options || {})

        //缓存所有路由
        this.routes = []

        var routes = this.options.routes || {}

        for (var name in routes) {
            if (routes.hasOwnProperty(name)) {
                this.route(name, routes[name])
            }
        }
    }

    var routeToRegExp = function(route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function(match, optional) {
                return optional ? match : '([^/?]+)'
            })
            .replace(splatParam, '([^?]*?)')
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$')
    }

    var extractParameters = function(route, fragment) {
        var params = route.exec(fragment).slice(1)
        return params.map(function(param, i) {
            // Don't decode the search params.
            if (i === params.length - 1) return param || null
            return param ? decodeURIComponent(param) : null
        })
    }

    var updateUrlHash = function(url,route){
        return url && url.replace(/#(.*)$/, '') + '#' + route
    }

    //更新hash
    var updateHash = function(router, route, replace) {
        var url = updateUrlHash(_location.href, route)

        if (CHANGE_EVENT === POPSTATE_EVENT) {
            _history[replace ? 'replaceState' : 'pushState']({}, document.title, url)
        } else {
            if (replace) {
                _location.replace(url)
            } else {
                // Some browsers require that `hash` contains a leading #.
                _location.hash = '#' + route
            }
        }
    }

    //获取hash值
    var getHash = function(url) {
        var match = url.match(hashRegExp)
        return match ? match[1] : ''
    }

    //获取更新hash后的url
    var getUpdatedHash = function(url, route) {
        return url && url.replace(hashRegExp, '') + '#' + route
    }

    var _prototype = Router.prototype

    /**
     * ## getCurrentRoute
     * 获取当前路由
     * @return {String} 当前路由
     */
    _prototype.getCurrentRoute = function() {
        return this._currentRoute
    }

    /**
     * ## start
     * 开始路由控制，必须调用start方法才能开始设置路由
     *
     * @return {instance} 当前实例
     */
    _prototype.start = function() {
        if (this._started) return this
        var self = this

        this._started = true

        //监听事件
        this._run = function(event) {
            return self.navigate(getHash(event.target.location.hash), {
                updateHash: false
            })
        }
        _window.addEventListener(CHANGE_EVENT, this._run)

        //根据hash执行事件
        self.navigate(getHash(_location.href), {
            updateHash: false
        })

        return self
    }

    /**
     * ## stop
     *
     * 停止路由，需调用start开始路由
     *
     * @return {instance} 当前实例
     */
    _prototype.stop = function() {
        _window.removeEventListener(CHANGE_EVENT, this._run)
        this._started = false
        return this
    }

    /**
     * ## navigate
     *
     * 导航到某一路由
     *
     * @param {String} route
     * @param {Object} opts  配置参数 {`trigger`:是否触发回调函数,`updateHash`:是否更新路由,`replace`:是否需要替换路由或者是更新路由}
     * @return {instance} 当前实例
     */
    _prototype.navigate = function(route, opts) {
        var self = this,
            options = self.options,
            f = true

        //解决重复执行问题
        if (self._currentRoute === route) return self

        opts = extend({
            trigger: true,
            updateHash:true,
            replace: false
        }, opts || {})

        //缓存当前route
        self._currentRoute = route

        if (!options.beforeRouteChange ||
            self._currentRoute == undefined ||
            options.beforeRouteChange.call(self, route) !== false) {
            opts.trigger ? self.routes.forEach(function(value) {

                if (value.route.test(route)) {
                    value.callback.apply(self, extractParameters(value.route, route))
                    f = false
                }
            }) : (f = false)

            //如果当前route没有在route 中，则将其重定向到默认route中。
            //
            //替换会出现一个问题，就是当前路由后续路由都会被替换。造成无法回退上以前的历史记录
            //
            //如果使用location.hash，则会出现后退按钮会一直无效
            f ? options.defaultRoute && _location.replace(getUpdatedHash(_location.href, options.defaultRoute)) : opts.updateHash && updateHash(self, route, opts.replace)
        }
        return self
    }

    /**
     * ## route / add
     *
     * 添加一个新的路由
     *
     * @param {String/RegExp}   route    路由或者正则表达式
     * @param {Function} callback 回调函数
     * @return {instance} 当前实例
     */
    _prototype.route = function(route, callback) {
        if (typeof route === 'string') route = routeToRegExp(route)
        this.routes.unshift({
            route: route,
            callback: callback
        })
        return this
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Router
    } else if (typeof define === 'function') {
        define(function() {
            return Router
        })
    } else {
        _window.Router = Router
    }
})()
