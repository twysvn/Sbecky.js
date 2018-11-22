
/**
*  General todo
*  - sb-button
*  - sb-error
*
*/

// TODO: support older ios versions
// TODO: if sb-bind af input/textarea radiobuttons -> hau an onchange listener drauf und update noa di variable
// TODO: fix search bind bug
// TODO: sb-ajax method="get"

var sbecky = {}

// element storage
var _sbecky_bindings = {}
var _sbecky_ajax_bindings = {}
var _sbecky_placeholder = {}
var _sbecky_forms = {}
var _sbecky_errors = {}
var _sbecky_buttons = {}
// var controls

// listeners
var _sbecky_change_listeners = {}
var _sbecky_oninput_listeners = {}
var _sbecky_onclick_listeners = {}
var _sbecky_onresponse_listeners = {}
var _sbecky_onresponse_error_listeners = {}
var _sbecky_onsubmit_listeners = {}

var _sbecky_onassign_override = {}

// other
var _sbecky_prefix = "_sbecky_"
var _sbecky_internal_vars = 0

var _sbecky_scroll_trigger = []

var _sbecky_is_ready = false;

// private config variables
var _sbecky_sould_call_change = true

var _sbecky_events_enabled = true

var _sbecky_ready = []

var _sbecky_is_loading = [];

function _sbecky_get_new_binding() {
    return (_sbecky_prefix + (_sbecky_internal_vars++))
}

function _sbecky_on_change(variable){
    return function(value) {
        for (var dom of _sbecky_bindings[variable]) {
            if (typeof value == "object") {
                dom.append(value)
            } else {
                var name = dom.tagName.toLowerCase()
                for (var c of dom.children) {
                    c.setAttribute("_sbecky_old", "")
                }

                //TODO: testn
                if(_sbecky_onassign_override[variable] != undefined && _sbecky_onassign_override[variable] != null) {
                    _sbecky_unbind(dom)
                    try{
                        dom.innerHTML = _sbecky_onassign_override[variable](dom.innerHTML, value)
                    }catch(e){
                        console.log("sbecky: Error in sbecky_onassign[" + variable + "] function: ", e);
                    }
                }else{
                    if (name == "input" || name == "textarea" || name == "select"){ // TODO: test
                        if (!dom.hasAttribute("sb-active")) {
                            dom.value = value
                        }else{
                            dom.removeAttribute("sb-active")
                        }
                    } else if (dom.getAttribute("sb-ajax") != undefined && dom.getAttribute("items") != undefined) {
                        // sb-ajax + items means append content
                        if (value.length > 0){
                            var wrapper = document.createElement(name);
                            wrapper.innerHTML = value;

                            while (wrapper.firstChild) {
                                dom.appendChild(wrapper.firstChild);
                            }

                            // dom.innerHTML += value
                        }
                    } else {
                        // normal set
                        _sbecky_unbind(dom)

                        dom.innerHTML = value

                        if (dom.hasAttribute('sb-remove-after')) {
                            (function (name) {
                                setTimeout(function () {
                                    sbecky["_" + name] = "";
                                }, parseInt(dom.getAttribute('sb-remove-after')));
                            })(variable);
                        }
                    }
                }
                for (var c of dom.children) {
                    if (!c.hasAttribute("_sbecky_old")){
                        _sbecky_search_and_register(c);
                        _sbecky_search_async_img();
                    }else{
                        c.removeAttribute("_sbecky_old")
                    }
                }
            }
        }
    }
}

function _sbecky_ajax_onclick_wrapper(el) {
    return function() {
        _sbecky_call_onclick(el.getAttribute("sb-bind"))
        sbecky_load(el.getAttribute("sb-bind"))
        // _sbecky_load(el, _sbecky_call_onresponse, _sbecky_call_onresponse_error)
        return false;
    }
}

function _sbecky_register_all(new_bindings) {
    for (var i in new_bindings) {
        if (new_bindings.hasOwnProperty(i)) {
            _sbecky_register(new_bindings[i].getAttribute("sb-bind"), new_bindings[i])
        }
    }
}

function _sbecky_register(variable, object) {

    // don't rebind
    // if (obj[variable] != undefined)
    //     return
    /* eslint-disable no-console */
    console.log("sbecky: register " + variable);

    var on_change = _sbecky_on_change(variable)
    var key = "_"+variable
    if (sbecky[key] == undefined) {
        sbecky[key] = {}
        Object.defineProperty(sbecky, variable, {
            get: function(){
                return this["_"+variable];
            },
            set: function(val){
                this["_"+variable] = val
                if(_sbecky_sould_call_change)
                    _sbecky_call_oninput(variable, val)
                on_change(val)
            }
        });
    }

    var name = object.tagName.toLowerCase()
    if (name == "input" || name == "textarea" || name == "select"){ // TODO: test, select?, checkbox?, radioboxes?, slider
        object.oninput = function() {
            var bind = this.getAttribute("sb-bind")
            this.setAttribute("sb-active", "true");
            sbecky[bind] = this.value
        };
        if (object.hasAttribute("value")) {
            sbecky[variable] = object.value;
        }

        // if(sbecky[dom.getAttribute("sb-bind")])
        //     dom.value = sbecky[dom.getAttribute("sb-bind")]

        // maybe oninput?
        object.onchange = function() {
            var variable = this.getAttribute("sb-bind")
            _sbecky_call_change(variable, this.value)
            // sbecky[bind] = this.value
        }
    }else{
        var obj = sbecky[variable];
        //if value is not yet set
        if(typeof obj === "object" &&
            Object.keys(obj).length === 0 &&
            obj.constructor === Object)
        {
            sbecky["_"+variable] = object.innerHTML
        }else{
            object.innerHTML = obj
        }
    }
}

function _sbecky_register_buttons(list) {
    for (var i in list) {
        if (list.hasOwnProperty(i)){
            var name = list[i].getAttribute("sb-button")
            if(_sbecky_ajax_bindings.hasOwnProperty(name) && _sbecky_ajax_bindings[name].hasAttribute('items')){
                var b = _sbecky_ajax_bindings[name]
                list[i].addEventListener('click', _sbecky_ajax_onclick_wrapper(b), false);
            }else{
                // _sbecky_buttons[i].setAttribute("href", "javascript:void(0)");
                list[i].addEventListener('click', _sbecky_button_onclick, false);
                // _sbecky_buttons[i].onclick = _sbecky_button_onclick
            }
        }
    }
}

function _sbecky_register_forms(list){
    for (var i in list) {
        if (list.hasOwnProperty(i)) {
            var name = list[i].getAttribute("sb-form");
            if (name == "") {
                name = _sbecky_get_new_binding();
            }
            list[i].setAttribute("sb-form", name);
            list[i].addEventListener("submit", function(e) {
                e.preventDefault();

                var type = this.getAttribute("method");
                var url = this.getAttribute("action");
                var data = this.serialize();
                data.append("sb-form", this.getAttribute("sb-form"));

                _sbecky_add_placeholder(name, 1)

                _sbecky_call_onsubmit(name, e);
                if (this.hasAttribute('sb-form-clear-on-submit')) {
                    this.reset();
                }
                (function (self) {
                    _sbecky_form_ajax(url, type, data, function(d){
                        // Todo: validate

                        _sbecky_remove_placeholder(self)

                        var n = self.getAttribute("sb-form");
                        _sbecky_call_onresponse(n, d);
                        sbecky[n] = d;
                    }, function(d){
                        // Todo: error, validate
                        if(_sbecky_errors[n] != undefined) _sbecky_remove_placeholder(self)
                        if(!_sbecky_add_error_placeholder(n))
                            sbecky[n] = d;// legacy support
                        var n = self.getAttribute("sb-form");
                        _sbecky_call_onresponse_error(n, d);
                    });
                })(this);
            }, false);
        }
    }
}

function _sbecky_form_ajax(url, type, data, success, error) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4) {
            if(this.status === 200) {
                success(this.responseText)
            }else{
                error(this.responseText)
            }
        }
    };
    xhttp.open(type, url, true);
    xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhttp.send(data);
}

function _sbecky_search(data, query) {
    var nl = data.querySelectorAll(query)
    return nl

    // fix?
    var list = [];
    for(var i = nl.length; i--; list.unshift(nl[i]));
    var p = data.parentNode
    if(p) {
        var qs = p.querySelectorAll(query)
        for (var j in qs) {
            if (qs.hasOwnProperty(j) && qs[j] == data) {
                list.push(qs[j])
            }
        }
    }
    return list
}

function _sbecky_search_all(data) {

    var keywords = [
            "[sb-placeholder]",
            "[sb-error]",
            "[sb-button]",
            "[sb-bind]",
            "[sb-ajax]",
            "[sb-form]",
            "[sb-id]"]
    var ret = {}
    for (kw of keywords) {
        ret[kw] = _sbecky_search(data, kw)
    }
    return ret
}

function _sbecky_unbind(data) {

    var all = _sbecky_search_all(data)

    // console.log("sbecky: unbind", all)

    // placeholder
    // for(var item of all["[sb-placeholder]"]) {
    //     _sbecky_placeholder[item.getAttribute("sb-placeholder")] = undefined
    // }

    // errors?
    // for(var item of all["[sb-error]"]) {
    //     _sbecky_placeholder[item.getAttribute("sb-error")] = undefined
    // }

    for(var item of all["[sb-button]"]) {
        _sbecky_buttons[item.getAttribute("sb-button")] = undefined
    }

    for(var item of all["[sb-bind]"]) {
        var index = _sbecky_bindings[item.getAttribute("sb-bind")].indexOf(item)
        if(index > -1) {
            _sbecky_bindings[item.getAttribute("sb-bind")].splice(index);
        }
    }

    for(var item of all["[sb-form]"]) {
        _sbecky_forms[item.getAttribute("sb-form")] = undefined
    }

    for(var item of all["[sb-ajax]"]) {
        _sbecky_ajax_bindings[item.getAttribute("sb-ajax")] = undefined
    }
}

function _sbecky_search_and_register(data) {
    var new_bindings = []

    var all = _sbecky_search_all(data)

    // load placeholder from dom
    // var list = _sbecky_search(data, "[sb-placeholder]")
    var list = all["[sb-placeholder]"]
    for (var item of list) {
        _sbecky_placeholder[item.getAttribute("sb-placeholder")] = item.outerHTML
        item.parentNode.removeChild(item);
    }

    // errors
    // list = _sbecky_search(data, "[sb-error]")
    list = all["[sb-error]"]
    for (item of list) {
        _sbecky_errors[item.getAttribute("sb-error")] = item.outerHTML
        item.parentNode.removeChild(item);
    }

    // buttons
    // list = _sbecky_search(data, "[sb-button]")
    list = all["[sb-button]"]
    for (item of list) {
        _sbecky_buttons[item.getAttribute("sb-button")] = item
    }

    // binding
    // list = _sbecky_search(data, "[sb-bind]")
    list = all["[sb-bind]"]
    for (item of list) {
        if (_sbecky_bindings[item.getAttribute("sb-bind")] == undefined)
            _sbecky_bindings[item.getAttribute("sb-bind")] = [item]
        else{
            _sbecky_bindings[item.getAttribute("sb-bind")].push(item)
            // item.value = sbecky[item.getAttribute("sb-bind")]
        }
        new_bindings.push(item)
    }

    // if sb-bind is missing map internally
    list = _sbecky_search(data, "[sb-ajax]")
    for (item of list) {
        var name = item.getAttribute("sb-bind")
        if (name == undefined || name == null) {
            name = _sbecky_get_new_binding()
            item.setAttribute("sb-bind", name)
            _sbecky_bindings[name] = [item]
            new_bindings.push(item)
        }
    }

    _sbecky_register_all(new_bindings);

    // ajax
    for (item of list) {
        _sbecky_sb_ajax(item)
    }

    // list = _sbecky_search(data, "[sb-button]")
    list = all["[sb-button]"]
    _sbecky_register_buttons(list)

    // forms
    // list = _sbecky_search(data, "[sb-form]")
    list = all["[sb-form]"]
    for (item of list) {
        _sbecky_forms[item.getAttribute("sb-form")] = item
    }
    _sbecky_register_forms(list)

    if(data != document){
        var el = data
        // var scripts = _sbecky_search(data, "script")
        // for (var i in scripts) {
        //     if (scripts.hasOwnProperty(i)) {
        //         // console.log(scripts[i].innerHTML);
        //         eval(scripts[i].innerHTML);
        //     }
        // }

        var scripts = el.querySelectorAll('script'),
            script, fixedScript, i, len;

        for (i = 0, len = scripts.length; i < len; i++) {
            script = scripts[i];
            fixedScript = document.createElement('script');
            fixedScript.type = script.type;
            if (script.innerHTML) fixedScript.innerHTML = script.innerHTML;
            else fixedScript.src = script.src;
            fixedScript.async = false;
            script.parentNode.replaceChild(fixedScript, script);
        }
    }else{
        // list = _sbecky_search(data, "[sb-id]")
        list = all["[sb-id]"]
        for(item of list)
            console.log("sb-id found. did you mean sb-bind?", item);
    }
}

function _sbecky_poll(item, time = 1000) {
    setTimeout(function functionName() {
        _sbecky_ajax_wrapper(item, undefined, function () {
            _sbecky_poll(item, time)
        })
    }, time);
};

function _sbecky_add_placeholder(name, items=1) {
    if (_sbecky_placeholder[name] != undefined){
        if (params["items"] != undefined){
            for (var i=0; i < items; i++) {
                sbecky[name] = _sbecky_placeholder[name]
            }
            return true
        }else{
            sbecky[name] = _sbecky_placeholder[name]
            _sbecky_bindings[name].innerHTML = _sbecky_placeholder[name]
            return true
        }
    }
    return false;
};

function _sbecky_remove_placeholder(el) {
    var list = _sbecky_search(el, "[sb-placeholder]")
    for (var item of list) {
        item.parentNode.removeChild(item);
    }
}

function _sbecky_add_error_placeholder(name){
    if (_sbecky_errors[name] != null) {
        sbecky[name] = _sbecky_errors[name]
        return true
    }
    return false
}

function _sbecky_remove_error_placeholder(el) {
    var list = _sbecky_search(el, "[sb-error]")
    for (var item of list) {
        item.parentNode.removeChild(item);
    }
}

function _sbecky_sb_ajax(item) {
    var name = item.getAttribute("sb-bind")
    var params = _sbecky_get_parameters(item)

    // add placeholder
    // var placeholder_count = 1
    // if (params["items"]) {
    //     placeholder_count = params["items"];
    // }
    // _sbecky_add_placeholder(name, placeholder_count)

    // only do on initial item
    // if (_sbecky_ajax_bindings[name] == undefined) {
    _sbecky_ajax_bindings[name] = item

    if (item.hasAttribute("sb-trigger")) {
        (function(item, params) {
            var event = item.getAttribute("sb-trigger")

            if (event == "none") {
            }else if (event == "poll" || event == "short-poll") {
                var time = 1000;
                if (event == "short-poll") {
                    time = 10;
                }else if(item.hasAttribute("poll-interval")){
                    time = parseInt(item.getAttribute("poll-interval"));
                }
                _sbecky_poll(item, time)
                _sbecky_ajax_wrapper(item, params)
            }else if(event == "scroll-end"){
                // TODO: scroll-end fixn

                _sbecky_scroll_trigger.push(item)
                _sbecky_ajax_wrapper(item)

            }else{
                item.addEventListener(event, function(e) {
                    // TODO: max 1 reqquest per second?
                    // e.stopPropagation();
                    var el = e.fromElement || e.relatedTarget;
                    if (el != null && el != this.parentNode) {
                        return;
                    }
                    _sbecky_ajax_wrapper(item)
                });
            }
        })(item, params);
    }else{
        _sbecky_ajax_wrapper(item, params)
    }
    // }else{
    //     console.log("no binding");
    // }
}

window.addEventListener("scroll", function(){
    var doc = document.documentElement;
    if(doc){
        for (el of _sbecky_scroll_trigger) {
            if (_is_at_end(el, 100)) {
                _sbecky_ajax_wrapper(el)
            }
        }

    }
})

function _is_at_end(el, offset) {
    var rect = el.getBoundingClientRect();
    var elemBottom = rect.bottom;
    return elemBottom - offset < window.innerHeight && elemBottom >= 0;
}

function _sbecky_remove_is_loading(name) {
    var index = _sbecky_is_loading.indexOf(name);
    if (index > -1) {
        _sbecky_is_loading.splice(index, 1);
    }
}

function _sbecky_ajax_wrapper(it, params=undefined, success=undefined, error=undefined) {
    if (!it.hasAttribute('sb-bind')) {
        console.log("sbecky error: element has no sb-bind", it);
        return;
    }
    if(params == undefined)
        params = _sbecky_get_parameters(it)

    var name = it.getAttribute("sb-bind")
    // var ids = _sbecky_search(it, "[sb-id]")

    // prevend loading more often
    if(_sbecky_is_loading.indexOf(name) >= 0)
        return;
    _sbecky_is_loading.push(name)

    // add placeholder
    var placeholder_count = 1
    if (params["items"]) {
        placeholder_count = params["items"];
    }
    _sbecky_add_placeholder(name, placeholder_count)

    if (_sbecky_buttons[name] != undefined) {
        _sbecky_buttons[name].style.display = "none";
    }

    if(params["items"] == undefined/* || ids.length < parseInt(params["items"])*/) {
        (function (n, d) {
            ajax(d.getAttribute("sb-ajax"), "POST", params, function(response) {

                _sbecky_remove_placeholder(d)

                if (_sbecky_buttons[name] != undefined && _sbecky_buttons[name].style.display == "none") {
                    _sbecky_buttons[name].style.display = "inline-block";
                }

                sbecky[n] = response

                if (success != undefined) {
                    success(response);
                }
                _sbecky_remove_is_loading(n)
                _sbecky_call_onresponse(n, response)
            }, function(e) {
                if(_sbecky_errors[n] != undefined) _sbecky_remove_placeholder(d)
                _sbecky_add_error_placeholder(n)
                if (error != undefined) {
                    error(e);
                }
                _sbecky_remove_is_loading(n)
                _sbecky_call_onresponse_error(n, e)
            });
        })(name, it);
    }else{
        _sbecky_load(it)
    }
}

// used to load more elements with sbecky ajax (only load more part)
//      load more + normal ajax konn di sbecky_load(el)
function _sbecky_load(elem, succ=undefined, err=undefined) {
    var parent = elem

    var list = _sbecky_search(parent, "[sb-id]")
    var id = 0

    //only use sb-id if no parent has sb-bind
    for (c of list) {
        var p = c.parentNode;
        var set = true;
        while(p != null && p != undefined && p != elem)  {
            if (p.hasAttribute('sb-bind')) {
                set = false;
            }
            p = p.parentNode;
        }
        if (set) {
            id = c.getAttribute("sb-id");
        }
    }

    params = _sbecky_get_parameters(parent)
    params["sb-id"] = id

    var name = parent.getAttribute("sb-bind")
    if (parent.getAttribute("sb-ajax") == undefined) {
        console.log("Error: sb-ajax not set on parent", parent);
    }else{
        (function(n, d, params){
            ajax(d.getAttribute("sb-ajax"), "POST", params, function(response) {

                // if load-more-button is hidden -> show
                if (_sbecky_buttons[name] != undefined && _sbecky_buttons[name].style.display == "none") {
                    _sbecky_buttons[name].style.display = "inline-block";
                }

                // var list = _sbecky_search(d, "[sb-placeholder]")
                // for (var it of list) {
                //     it.parentNode.removeChild(it);
                // }
                _sbecky_remove_placeholder(d)

                // remove button if no sb-id in response
                if (response.indexOf("sb-id") == -1) {
                    var btn = _sbecky_buttons[n]
                    if (btn != undefined)
                        btn.parentNode.removeChild(btn)
                }

                // only set variable if response contains sb-id
                if (response.indexOf("sb-no-set") == -1) {
                    sbecky[n] = response
                }

                if(succ) succ(n, response)
                _sbecky_remove_is_loading(n)
                _sbecky_call_onresponse(n, response)
            }, function(err) {
                if(_sbecky_errors[n] != undefined) _sbecky_remove_placeholder(d)
                //TODO error handling
                if(err) err(n, err)
                _sbecky_remove_is_loading(n)
                _sbecky_add_error_placeholder(n)
                _sbecky_call_onresponse_error(n, err)
            })
        })(name, parent, params);
    }
}

function _sbecky_button_onclick(e) {
    e.preventDefault()
    _sbecky_call_onclick(name)
    var params = _sbecky_get_parameters(this)
    var url = this.getAttribute("href")
    var name = this.getAttribute("sb-button");

    // if javascript: ... -> check for ajax and form to exec
    if(url.indexOf("javascript:") >= 0){

        // first ajax
        var ajax_bind = _sbecky_ajax_bindings[name]
        if(_sbecky_ajax_bindings[name] != undefined) {
            sbecky_load(name)
            return;
            // url = ajax_bind.getAttribute("sb-ajax")
        }
        // params = _sbecky_get_parameters(ajax_bind)

        // then forms
        var form_bind = _sbecky_forms[name]
        if(form_bind[0][name] != undefined) {
            // TODO: load form
            return;
        }

    }

    _sbecky_add_placeholder(this.getAttribute("sb-button"));

    (function(self){
        // TODO: dont do ajax until response from last received
        ajax(url, "POST", params, function(response) {
            //Todo: handle callback
            // self.innerHTML = response
            // var r = document.createTextNode(response)
            // self.parentNode.replaceChild(self, r)

            _sbecky_remove_placeholder(_sbecky_bindings[self.getAttribute("sb-button")][0])
            _sbecky_remove_error_placeholder(_sbecky_bindings[self.getAttribute("sb-button")][0])


            sbecky[self.getAttribute("sb-button")] = response

            _sbecky_call_onresponse(name, response)
        }, function(e) {
            //Todo: handle error callback

            // TODO: maybe?
            // sbecky[self.getAttribute("sb-button")] = e
            _sbecky_add_error_placeholder(_sbecky_bindings[self.getAttribute("sb-button")])

            // self.innerHTML = response
            _sbecky_call_onresponse_error(name, e)
        });
    })(this);
    return false
}

function _sbecky_call_onclick(variable) {
    if(_sbecky_events_enabled)
        if (_sbecky_onclick_listeners[variable] != undefined)
            for (var f of _sbecky_onclick_listeners[variable]) {
                try{
                    f();
                }catch(e){
                    console.log("sbecky: Error in sbecky_onclick function: ", e);
                }
            }
}

function _sbecky_call_onresponse(variable, param) {
    if(_sbecky_events_enabled)
        if (_sbecky_onresponse_listeners[variable] != undefined)
            for (var f of _sbecky_onresponse_listeners[variable]) {
                try{
                    f(param);
                }catch(e){
                    console.log("sbecky: Error in sbecky_onresponse function: ", e);
                }
            }
}

function _sbecky_call_onresponse_error(variable, param) {
    if(_sbecky_events_enabled)
        if (_sbecky_onresponse_error_listeners[variable] != undefined)
            for (var f of _sbecky_onresponse_error_listeners[variable]) {
                try{
                    f(param);
                }catch(e){
                    console.log("sbecky: Error in sbecky_onresponse_error function: ", e);
                }
            }
}

function _sbecky_call_onsubmit(variable, param) {
    if(_sbecky_events_enabled)
        if (_sbecky_onsubmit_listeners[variable] != undefined)
            for (var f of _sbecky_onsubmit_listeners[variable]) {
                try{
                    f(param);
                }catch(e){
                    console.log("sbecky: Error in sbecky_onsubmit function: ", e);
                }
            }
}

function _sbecky_call_change(variable, param) {
    if (_sbecky_change_listeners[variable] != undefined)
        for (var f of _sbecky_change_listeners[variable]) {
            try{
                f(param);
            }catch(e){
                console.log("sbecky: Error in sbecky_onchange function: ", e);
            }
        }
}

function _sbecky_call_oninput(variable, param) {
    if (_sbecky_oninput_listeners[variable] != undefined)
        for (var f of _sbecky_oninput_listeners[variable]) {
            try{
                f(param);
            }catch(e){
                console.log("sbecky: Error in sbecky_oninput function: ", e);
            }
        }
}

// converts html attributes to parameter dict
function _sbecky_get_parameters(obj) {
    var attrs = [...obj.attributes].map(attr => attr.nodeName).filter(function(el){
            return el.indexOf("sb-") === -1 && el != "class" && el != "id" && el != "onclick" && el != "href"})
    params = {}
    for (attr of attrs) {
        params[attr] = obj.getAttribute(attr)
    }
    return params
}

/*
    Async Image loading
*/
function _sbecky_search_async_img(){
    var images = document.getElementsByTagName('img');
    _sbecky_handle_async(images)
    var iframes = document.getElementsByTagName('iframe');
    _sbecky_handle_async(iframes)
}

function _sbecky_handle_async(objs) {
    // TODO: fix placeholder
    for (var i in objs) {
        if (objs.hasOwnProperty(i)) {
            var obj = objs[i];
            if (obj.hasAttribute('sb-async-src')) {
                obj.setAttribute('src', obj.getAttribute('sb-async-src'));
                obj.removeAttribute('sb-async-src');
            }
        }
    }
}

// TODO: use events
window.onload = function() {
    _sbecky_search_and_register(document)
    console.log("sbecky is ready.");
    _sbecky_is_ready = true;
    for (var fun of _sbecky_ready) {
        try{
            fun();
        }catch(e){
            console.log("sbecky: Error in sbecky_ready function: ", e);
        }
    }
    _sbecky_search_async_img();
}

// normal serialize
HTMLElement.prototype.serialize = function() {
    var data = new FormData(this);
    wat = data
    var finput = this.getElementsByTagName("input")
    var j=0
    for (var i in finput) {
        if (finput.hasOwnProperty(i)) {
            var input = finput[i]
            if (input.getAttribute("type") == "file"){
                if (input.files.length > 0) {
                    var lefile = input.files[0]
                    if(input.hasAttribute("name")
                            && input.hasAttribute("name")!= null
                            && input.hasAttribute("name") != undefined
                            && input.hasAttribute("name") != ""){
                        data.append(input.getAttribute("name"), lefile);
                    }else{
                        data.append(""+j, lefile);
                    }
                }
                j++
            }
        }
    }
    return data
}

HTMLElement.prototype.serialize_dom = function() {

    var data = new FormData();
    var elements = this.querySelectorAll( "input, select, textarea" );
    for( var i = 0; i < elements.length; ++i ) {
        var element = elements[i];
        var name = element.name;
        var value = element.value;

        if( name ) {
            data.append(name, value);
        }
    }
    var finput = this.getElementsByTagName("input")
    var j=0
    for (var i in finput) {
        if (finput.hasOwnProperty(i)) {
            var input = finput[i]
            if (input.getAttribute("type") == "file"){
                if (input.files.length > 0) {
                    var lefile = input.files[0]
                    if(input.hasAttribute("name")
                            && input.hasAttribute("name")!= null
                            && input.hasAttribute("name") != undefined
                            && input.hasAttribute("name") != ""){
                        data.append(input.getAttribute("name"), lefile);
                    }else{
                        // add wenns koan name tag het
                        data.append(""+j, lefile);
                    }
                }
                j++
            }
        }
    }
    return data
}


//foll(s a problem osch mit mir noa mogschmors lei sogn. i tua di oi. nor konnsch dein mogn afn bodn huamtrogn)s mor amol probleme hobm -> var DOMReady = function(a,b,c){b=document,c='addEventListener';b[c]?b[c]('DOMContentLoaded',a):window.attachEvent('onload',a)}
function sbecky_ready(fun) {
    if (_sbecky_is_ready)
        try{
            fun();
        }catch(e){
            console.log("sbecky: Error in sbecky_ready function: ", e);
        }
    else
        _sbecky_ready.push(fun)
}

function sbecky_get(variable) {
    return _sbecky_bindings[variable]
}

// submit sbecky forms
function sbecky_submit(form) {
    var event;
    if (document.createEvent) {
        event = document.createEvent("HTMLEvents");
        event.initEvent("submit", true, true);
    } else {
        event = document.createEventObject();
        event.eventType = "submit";
    }

    event.eventName = "submit";

    if (document.createEvent) {
        form.dispatchEvent(event);
    } else {
        form.fireEvent("on" + event.eventType, event);
    }
}

// variable can be variable name or string
function sbecky_load(variable) {
    if (typeof variable == "object") {
        var obj = variable
        if(obj.hasAttribute("sb-ajax")) {
            _sbecky_ajax_wrapper(variable)
        }else if(obj.hasAttribute("sb-button")){
            obj.click()
        }else if(obj.hasAttribute("sb-form")){
            sbecky_submit(obj)
        }
    }else if (_sbecky_ajax_bindings[variable] != undefined) {
        _sbecky_ajax_wrapper(_sbecky_ajax_bindings[variable])
    }else if (_sbecky_forms[variable] != undefined) {
        sbecky_submit(_sbecky_forms[variable])
    }else if (_sbecky_buttons[variable] != undefined) {
        _sbecky_buttons[variable].click()
    }else{
        console.log("sbecky: debug! sbecky_load could not find variable: ", variable);
    }
}

// std ajax request
function ajax(url, type, params={}, success = function(){}, error = function(){}) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4) {
            if(this.status === 200) {
                success(this.responseText)
            }else{
                error(this.responseText)
            }
        }
    };

    xhttp.open(type, url, true);
    xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhttp.send(Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
    }).join('&'));
}

// get request
function get(url, data, success = function(){}, error = function(){}) {
    url += "?" + Object.keys(data).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
    }).join('&');
    ajax(url, "GET", {}, success, error)
}

// post request
function post(url, data, success = function(){}, error = function(){}) {
    ajax(url, "POST", data, success, error)
}


function sbecky_change(variable, f = function(){}) {
    console.log("sbecky: register onchange", variable);
    if (_sbecky_change_listeners[variable] == undefined){
        _sbecky_change_listeners[variable] = [f]
    } else {
        _sbecky_change_listeners[variable].push(f)
    }
}

// input onchange event
function sbecky_onchange(v, f = function(){}) {
    sbecky_change(v, f)
}

function sbecky_onassign(variable, f = function(){}) {
    console.log("sbecky: register onassign_override", variable);
    _sbecky_onassign_override[variable] = f
}

function sbecky_onsubmit(variable, f = function(){}) {
    console.log("sbecky: register onsubmit", variable);
    if (_sbecky_onsubmit_listeners[variable] == undefined){
        _sbecky_onsubmit_listeners[variable] = [f]
    } else {
        _sbecky_onsubmit_listeners[variable].push(f)
    }
}

function sbecky_oninput(variable, f = function(){}) {
    console.log("sbecky: register onchange", variable);
    if (_sbecky_oninput_listeners[variable] == undefined){
        _sbecky_oninput_listeners[variable] = [f]
    } else {
        _sbecky_oninput_listeners[variable].push(f)
    }
}

// button click
function sbecky_onclick(variable, f = function(){}) {
    console.log("sbecky: register onclick", variable);
    if (_sbecky_onclick_listeners[variable] == undefined){
        _sbecky_onclick_listeners[variable] = [f]
    } else {
        _sbecky_onclick_listeners[variable].push(f)
    }
}

// button click ajax done
function sbecky_onresponse(variable, f = function(){}) {
    console.log("sbecky: register onresponse", variable);
    if (_sbecky_onresponse_listeners[variable] == undefined){
        _sbecky_onresponse_listeners[variable] = [f]
    } else {
        _sbecky_onresponse_listeners[variable].push(f)
    }
}

// button click ajax error
function sbecky_onresponse_error(variable, f = function(){}) {
    console.log("sbecky: register onresponse_error", variable);
    if (_sbecky_onresponse_error_listeners[variable] == undefined){
        _sbecky_onresponse_error_listeners[variable] = [f]
    } else {
        _sbecky_onresponse_error_listeners[variable].push(f)
    }
}

// Experimental
// var elements = {}
// var scope = [] //wait! scopes?
// function getModule(url, complete, retries = 3) {
//     ajax(url, "GET", {}, complete, function () {
//         if (retries > 0) {
//             getModule(url, complete, retries - 1)
//         }
//     })
// }
//
// function sbecky_with_data(moduleurl, url, variable) {
//     getModule(moduleurl, function(modulehtml){
//         _sbecky_get_with_module(modulehtml, url, variable);
//     });
// }
//
// function _sbecky_get_with_module(modulehtml, url, puthere) {
//     ajax(url, "GET", {}, function(response) {
//
//         var json = JSON.parse(response)
//         var dom = createDOM(modulehtml)
//
//         var binds = _sbecky_search(dom, "[sb-bind]")
//         var iterates = _sbecky_search(dom, "[sb-iterate]")
//
//         for (var i in iterates) {
//             if (iterates.hasOwnProperty(i)) {
//                 var elem = iterates[i]
//                 // TODO: search and replace sb-iterate with template
//                 elements[elem.getAttribute("sb-iterate")] = elem
//                 var clone = elem.cloneNode(true)
//                 // elem = elem.parentNode
//                 // elem.parentNode.innerHTML = ""
//                 // elem.innerHTML = ""
//                 var parent = elem.parentNode
//                 parent.innerHTML = ""
//                 console.log("inner", parent);
//                 // parent.innerHTML = ""
//
//                 var posts = json[elem.getAttribute("sb-iterate")]
//
//                 for (var j in posts) {
//                     if (posts.hasOwnProperty(j)) {
//                         // console.log("1", elem.cloneNode(true));
//                         var post = posts[j]
//
//                         var scp = scope[scope.push({}) - 1]
//
//                         var bindingindex = bindings.push({}) - 1
//                         var bng = bindings[bindingindex ]
//                         var newdom = clone.cloneNode(true);
//
//                         var binds2 = _sbecky_search(newdom, "[sb-bind]")
//                         for (var k in binds2) {
//                             if (binds.hasOwnProperty(k)) {
//                                 _sbecky_register(binds2[k].getAttribute("sb-bind"), scp, bindingindex)
//
//                                 bng[binds2[k].getAttribute("sb-bind")] = binds2[k]
//                             }
//                         }
//                         parent.append(newdom)
//
//
//                         for (var variable in post) {
//                             if (post.hasOwnProperty(variable)) {
//                                 scp[variable] = post[variable]
//                             }
//                         }
//                     }
//                 }
//                 sbecky[puthere] = parent
//             }
//         }
//
//
//         // for (var item in list) {
//         //     if (list.hasOwnProperty(item)) {
//         //         var itemdom = list[item];
//         //         bindings[itemdom.getAttribute("sb-bind")] = itemdom
//         //     }
//         // }
//         //
//         // _sbecky_registerAll();
//         //
//         //
//         // _sbecky_search(modulehtml, )
//         // sbecky.posts = modulehtml
//         //
//         //
//         // console.log(modulehtml, response)
//
//
//
//     }, function(){
//         //TODO handle error
//     })
// }
// function createDOM(string) {
//     var parser = new DOMParser()
//     return parser.parseFromString(string, "text/xml");
// }
