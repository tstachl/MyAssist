(function() {
    var $ = window.jForce = {};
    
    // id counter for unique id
    var idCounter = 0,

        ArrayProto          = Array.prototype,
        ObjProto            = Object.prototype,
        FuncProto           = Function.prototype,

    // references to core prototype functions
        slice               = ArrayProto.slice,
        unshift             = ArrayProto.unshift,
        toString            = ObjProto.toString,
        hasOwnProperty      = ObjProto.hasOwnProperty,

    // native functions
        nativeForEach       = ArrayProto.forEach,
        nativeBind          = FuncProto.bind;

    // Internal function used to implement `_.throttle` and `_.debounce`.
    var limit = function(func, wait, debounce) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var throttler = function() {
                timeout = null;
                func.apply(context, args);
            };
            if (debounce) clearTimeout(timeout);
            if (debounce || !timeout) timeout = setTimeout(throttler, wait);
        };
    };
    
    // Add the each function to the Array prototype
    Array.prototype.each = function(iterator, context) {
        if (nativeForEach && this.forEach === nativeForEach) {
            this.forEach(iterator, context);
        }
        
        for (var i = 0, l = this.length; i < l; i++) 
            if (i in this && iterator.call(context, this[i], i, this) === {})
                return;
    };
    
    // Add the each function to the Object prototype
    Object.prototype.each = function(iterator, context) {
        for (var key in this)
            if (hasOwnProperty.call(this, key))
                if (iterator.call(context, this[key], key, this) == {})
                    return;
    };

    // Add the extend function to the Object prototype
    Object.prototype.extend = function() {
        var obj = this;
        arguments.each(function(source) {
            source.each(function(value, key) {
                if (source[prop] !== void 0) obj[key] = value;
            });
        });
        return this;
    };
    
    // Extend the object prototype with heavy used functions
    Object.prototype.extend({
        // Retrieve the names of an object's properties.
        keys: function() {
            var keys = [],
                obj = this;
            this.each(function(value, key) {
                if (hasOwnProperty.call(obj, key))
                    keys.push(key);
            });
            return keys;
        },
        
        // Retrieve the values of an object's properties.
        values: function() {
            return this.map(identity);
        },
        
        // Return a sorted list of the function names available on the object.
        functions: function() {
            var names = [];
            this.each(function(value, key, obj) {
                if (typeof(value) == 'function') names.push(key);
            });
            return names.sort();
        },
        
        // Fill in a given object with default properties.
        defaults: function() {
            var obj = this;
            arguments.each(function(source) {
                source.each(function(value, key) {
                    if (obj[key] == null) obj[key] = value;
                });
            });
            return this;
        },
        
        // Create a (shallow-cloned) duplicate of an object.
        clone: function() {
            return $.extend({}, this);
        },
        
        // Invokes interceptor with the obj, and then returns obj.
        // The primary purpose of this method is to "tap into" a method chain, in
        // order to perform operations on intermediate results within the chain.
        tap: function(interceptor) {
            interceptor(this);
            return this;
        },
        
        // Return the results of applying the iterator to each element.
        map: function(iterator, context) {
            return $.map(this, iterator, context);
        },
        
        // **Reduce** builds up a single result from a list of values
        reduce: function(iterator, memo, context) {
            return $.reduce(this, iterator, memo, context);
        },
        
        // The right-associative version of reduce
        reduceRight: function(iterator, memo, context) {
            return $.reduceRight(this, iterator, memo, context);
        },
        
        // Return the first value which passes a truth test.
        find: function(iterator, context) {
            return $.find(this, iterator, context);
        },
        
        // Return all the elements that pass a truth test.
        filter: function(iterator, context) {
            return $.filter(this, iterator, context);
        },
        
        // Return all the elements for which a truth test fails.
        reject: function(iterator, context) {
            return $.reject(this, iterator, context);
        },
        
        // Determine whether all of the elements match a truth test.
        every: function(iterator, context) {
            return $.every(this, iterator, context);
        },
        
        // Determine if at least one element in the object matches a truth test.
        any: function(iterator, context) {
            return $.some(this, iterator, context);
        },
        
        // Determine if a given value is included in the array or object using `===`.
        contains: function(target) {
            return $.contains(this, target);
        }
    });
    
    Array.prototype.extend({
        // Array Functions
        // ---------------
        
        // Get the first element of an array. Passing **n** will return the first N
        // values in the array. The **guard** check allows it to work
        // with `$.map`.
        first: function(n, guard) {
            return (n != null) && !guard ? slice.call(this, 0, n) : this[0];
        },
        
        // Returns everything but the first entry of the array. Aliased as `tail`.
        // Especially useful on the arguments object. Passing an **index** will return
        // the rest of the values in the array from that index onward. The **guard**
        // check allows it to work with `$.map`.
        rest: function(index, guard) {
            return slice.call(this, (index == null) || guard ? 1 : index);
        },
        
        // Get the last element of an array.
        last: function() {
            return this[this.length - 1];
        },
        
        // Trim out all falsy values from an array.
        compact: function() {
            return $.filter(this, function(value) { return !!value; });
        },
        
        // Return a completely flattened version of an array.
        flatten: function() {
            return $.reduce(this, function(memo, value) {
                if ($.isArray(value)) return memo.concat($.flatten(value));
                memo[memo.length] = value;
                return memo;
            }, []);
        },
        
        // Return a version of the array that does not contain the specified value(s).
        without: function() {
            return this.difference(slice.call(arguments));
        },
        
        // Produce a duplicate-free version of the array. If the array has already
        // been sorted, you have the option of using a faster algorithm.
        unique: function(isSorted, iterator) {
            var initial = iterator ? $.map(this, iterator) : this,
                result = [],
                array = this;
            $.reduce(initial, function(memo, el, i) {
                if (0 == i || (isSorted === true ? memo.last() != el : !$.contains(memo, el))) {
                    memo[memo.length] = el;
                    result[result.length] = array[i];
                }
                return memo;
            }, []);
            return result;
        },
        
        // Produce an array that contains every item shared between all the
        // passed-in arrays.
        intersection: function() {
            var args = slice.call(arguments);
            return $.filter(this.unique(), function(item) {
                return $.every(args, function(other) {
                    return $.contains(other, item) >= 0;
                });
            });
        },
        
        // Take the difference between one array and another.
        // Only the elements present in just the first array will remain.
        difference: function(other) {
            return $.filter(this, function(value) { return !$.contains(other, value); });
        },
        
        // Return the position of the first occurrence of an
        // item in an array, or -1 if the item is not included in the array.
        indexOf: function(item, isSorted) {
            var i, l;
            if (isSorted) {
                i = $.sortedIndex(this, item);
                return this[i] === item ? i : -1;
            }
            for (i = 0, l = this.length; i < l; i++) if (this[i] === item) return i;
            return -1;
        },
        
        lastIndexOf: function(item) {
            var i = this.length;
            while (i--) if (this[i] === item) return i;
            return -1;
        }
    });

    $.extend({
        // Standalone extend function useful to create clones
        extend: function(obj) {
            slice.call(arguments, 1).each(function(source) {
                source.each(function(value, key) {
                    if (value !== void 0)
                        obj[key] = value;
                });
            });
            return obj;
        },
        
        // Collection Functions
        // --------------------
        
        // Reduce builds up a single result from a list of values.
        reduce: function(o, i, m, c) {
            var initial = m !== void 0;
            if (o == null) o = [];
            if (nativeReduce && o.reduce === nativeReduce) {
                if (c) i = $.proxy(i, c);
                return initial ? o.reduce(i, m) : o.reduce(i);
            }
            $.each(o, function(val, index) {
                if (!initial) {
                    m = val;
                    initial = true;
                } else {
                    m = i.call(c || this, m, val, index, o);
                }
            });
            if (!initial) throw new TypeError('Reduce of empty array with no initial value');
            return m;
        },
        
        // The right-associative version of reduce.
        reduceRight: function(o, i, m, c) {
            if (o == null) o = [];
            if (nativeReduceRight && o.reduceRight === nativeReduceRight) {
                if (c) i = $.proxy(i, c);
                return m !== void 0 ? o.reduceRight(i, m) : o.reduceRight(i);
            }
            var reversed = ($.isArray(o) ? o.slice() : $.toArray(o)).reverse();
            return $.reduce(reversed, i, m, c);            
        },
        
        // Return the first value which passes a truth test.
        detect: function(obj, iterator, context) {
            var result;
            $.some(obj, function(value, index) {
                if (iterator.call(context || this, value, index, obj)) {
                    result = value;
                    return true;
                }
            });
            return result;
        },
        
        // Return all the elements that pass a truth test.
        filter: function(o, i, c) {
            var results = [];
            if (o == null) return results;
            if (nativeFilter && o.filter === nativeFilter) return o.filter(i, c || this);
            $.each(o, function(val, index) {
                if (i.call(c || this, val, index, o)) results[results.length] = val;
            });
            return results;
        },
        
        // Return all the elements for which a truth test fails.
        reject: function(o, i, c) {
            var results = [];
            if (o == null) return results;
            $.each(o, function(val, index) {
                if (!i.call(c || this, val, index, o)) results[results.length] = val;
            });
            return results;
        },
        
        // Determine whether all of the elements match a truth test.
        every: function(o, i, c) {
            var result = true;
            if (o == null) return result;
            if (nativeEvery && o.every === nativeEvery) return o.every(i, c || this);
            $.each(o, function(val, index) {
                if (!(result = result && i.call(c || this, value, index, o))) return {};
            });
            return result;
        },
        
        // Determine if at least one element in the object matches a truth test.
        some: function(obj, iterator, context) {
            iterator = iterator || $.identity;
            var result = false;
            if (obj == null) return result;
            if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
            $.each(obj, function(value, index) {
                if (result |= iterator.call(context || this, value, index, obj)) return {};
            });
            return !!result;
        },
        
        // Determine if a given value is included in the array or object using `===`.
        contains: function(o, t) {
            var found = false;
            if (o == null) return found;
            if (nativeIndexOf && o.indexOf === nativeIndexOf) return o.indexOf(t) != -1;
            $.some(o, function(v) {
                if (found = v === t) return true;
            });
            return found;
        },
        
        // Invoke a method (with arguments) on every item in a collection.
        invoke: function(o, m) {
            var args = slice.call(arguments, 2);
            return $.map(o, function(v) {
                return (m.call ? m || v : v[m]).apply(v, args);
            });
        },
        
        // Convenience version of a common use case of `map`: fetching a property.
        pluck: function(o, k) {
            return $.map(o, function(v) { return v[k]; });
        },
        
        // Return the maximum element or (element-based computation).
        max: function(o, i, c) {
            if (!i && $.isArray(o)) return Math.max.apply(Math, o);
            var result = {computed: -Infinity};
            $.each(o, function(val, index) {
                var computed = i ? i.call(c || this, val, index, o) : val;
                computed >= result.computed && (result = {value: val, computed: computed});
            });
            return result.value;
        },
        
        // Return the minimum element (or element-based computation).
        min: function(o, i, c) {
            if (!i && $.isArray(o)) return Math.min.apply(Math, o);
            var result = {computed: Infinity};
            $.each(o, function(val, index) {
                var computed = i ? i.call(c || this, val, index, o) : val;
                computed < result.computed && (result = {value: val, computed: computed});
            });
            return result.value;
        },
        
        // Sort the object's values by a criterion produced by an iterator.
        sortBy: function(o, i, c) {
            return $.pluck($.map(o, function(val, index) {
                return {
                    value: val,
                    criteria: i.call(c || this, val, index, o)
                };
            }).sort(function(left, right) {
                var a = left.criteria, b = right.criteria;
                return a < b ? -1 : a > b ? 1 : 0;
            }), 'value');
        },
        
        // Groups the object's values by a criterion produced by an iterator
        groupBy: function(o, i) {
            var result = {};
            $.each(o, function(val, index) {
                var key = i(val, index);
                (result[key] || (result[key] = [])).push(val);
            });
            return result;
        },
        
        // Use a comparator function to figure out at what index an object should
        // be inserted so as to maintain order. Uses binary search.
        sortedIndex: function(a, o, i) {
            i || (i = $.identity);
            var low = 0, high = a.length;
            while (low < high) {
                var mid = (low + high) >> 1;
                i(a[mid]) < i(o) ? low = mid + 1 : high = mid;
            }
            return low;
        },
        
        // Safely convert anything iterable into a real, live array.
        toArray: function(i) {
            if (!i)                 return [];
            if (i.toArray)          return i.toArray();
            if ($.isArray(i))       return slice.call(i);
            if ($.isArguments(i))   return slice.call(i);
            return $.values(i);
        },
        
        // Return the number of elements in an object.
        size: function(o) {
            return $.toArray(o).length;
        },
        
        // Generate an integer Array containing an arithmetic progression. A port of
        // the native Python `range()` function. See
        // [the Python documentation](http://docs.python.org/library/functions.html$range).
        range: function(start, stop, step) {
            if (arguments.length <= 1) {
                stop = start || 0;
                start = 0;
            }
            step = arguments[2] || 1;
            
            var len = Math.max(Math.ceil((stop - start) / step), 0),
                idx = 0,
                range = new Array(len);
            
            while (idx < len) {
                range[idx++] = start;
                start += step;
            }
            
            return range;
        },
        
        // Zip together multiple lists into a single array -- elements that share
        // an index go together.
        zip: function() {
            var args = slice.call(arguments),
                length = $.max($.pluck(args, 'length')),
                results = new Array(length);
            for (var i = 0; i < length; i++) results[i] = $.pluck(args, '' + i);
            return results;
        },
        
        // Produce an array that contains the union: each distinct element from all of
        // the passed-in arrays.
        union: function() {
            return arguments.flatten().unique();
        },
    });
    
    
    /*
    $.extend({

        

        
        // Function
        // --------
        
        // Create a function bound to a given object (assigning `this`, and arguments,
        // optionally). Binding with arguments is also known as `curry`.
        bind: function(func, obj) {
            if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
            var args = slice.call(arguments, 2);
            return function() {
                return func.apply(obj, args.concat(slice.call(arguments)));
            };
        },
        
        // Bind all of an object's methods to that object. Useful for ensuring that
        // all callbacks defined on an object belong to it.
        bindAll: function(obj) {
            var funcs = slice.call(arguments, 1);
            if (funcs.length == 0) funcs = $.functions(obj);
            $.each(func, function(f) { obj[f] = $.bind(obj[f], obj); });
            return obj;
        },
        
        // Memoize an expensive function by storing its results.
        memoize: function(func, hasher) {
            var memo = {};
            haser || (hasher = $.identity);
            return function() {
                var key = hasher.apply(this, arguments);
                return hasOwnProperty.call(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
            };
        },
        
        // Delays a function for the given number of milliseconds, and then calls
        // it with the arguments supplied.
        delayFunction: function(func, wait) {
            var args = slice.call(arguments, 2);
            return setTimeout(function() { return func.apply(func, args); }, wait);
        },
        
        // Defers a function, scheduling it to run after the current call stack has
        // cleared.
        defer: function(func) {
            return $.delayFunction.apply($, [func, 1].concat(slice.call(arguments, 1)));
        },
        
        // Returns a function, that, when invoked, will only be triggered at most once
        // during a given window of time.
        throttle: function(func, wait) {
            return limit(func, wait, false);
        },
        
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds.
        debounce: function(func, wait) {
            return limit(func, wait, true);
        },

        // Returns a function that will be executed at most one time, no matter how
        // often you call it. Useful for lazy initialization.
        once: function(func) {
            var ran = false, memo;
            return function() {
                if (ran) return memo;
                ran = true;
                return memo = func.apply(this, arguments);
            };
        },
        
        // Returns the first function passed as an argument to the second,
        // allowing you to adjust arguments, run code before and after, and
        // conditionally execute the original function.
        wrap: function(func, wrapper) {
            return function() {
                var args = [func].concat(slice.call(arguments));
                return wrapper.apply(this, args);
            };
        },
        
        // Returns a function that is the composition of a list of functions, each
        // consuming the return value of the function that follows.
        compose: function() {
            var funcs = slice.call(arguments);
            return function() {
                var args = slice.call(arguments);
                for (var i = funcs.length - 1; i >= 0; i--) args = [funcs[i].apply(this, args)];
                return args[0];
            };
        },
        
        // Returns a function that will only be executed after being called N times.
        after: function(times, func) {
            return function() {
                if (--times < 1) { return func.apply(this, arguments); };
            };
        },
        
        // Object Functions
        // ----------------
        
        // Retrieve the names of an object's properties.
        keys: nativeKeys || function(o) {
            if(obj !== Object(obj))
                throw new TypeError('Invalid object');
            var keys = [];
            for(var key in obj)
            if(hasOwnProperty.call(obj, key))
                keys[keys.length] = key;
            return keys;
        },
        
        // Retrieve the values of an object's properties.
        values: function(o) {
            return $.map(o, $.identity);
        },
        
        // Return a sorted list of the function names available on the object.
        functions: function(obj) {
            var names = [];
            for (var key in obj)
                if ($.isFunction(obj[key]))
                    names.push(key);
            return names.sort();
        },
        
        // Fill in a given object with default properties.
        defaults: function(obj) {
            $.each(slice.call(arguments, 1), function(source) {
                for (var prop in source)
                    if (obj[prop] == null)
                        obj[prop] = source[prop];
            });
            return obj;
        },
        
        // Create a (shallow-cloned) duplicate of an object.
        clone: function(obj) {
            return $.isArray(obj) ? obj.slice() : $.extend({}, obj);
        },
        
        // Invokes interceptor with the obj, and then returns obj.
        // The primary purpose of this method is to "tap into" a method chain, in
        // order to perform operations on intermediate results within the chain.
        tap: function(obj, interceptor) {
            interceptor(obj);
            return obj;
        },
        
        // Perform a deep comparison to check if two objects are equal.
        isEqual: function(a, b) {
            // Check object identity.
            if (a === b) return true;
            // Different types?
            var atype = typeof (a), btype = typeof (b);
            if (atype != btype) return false;
            // Basic equality test (watch out for coercions).
            if (a == b) return true;
            // One is falsy and the other truthy.
            if ((!a && b) || (a && !b)) return false;
            // Unwrap any wrapped objects.
            if (a._chain) a = a._wrapped;
            if (b._chain) b = b._wrapped;
            // One of them implements an isEqual()?
            if (a.isEqual) return a.isEqual(b);
            if (b.isEqual) return b.isEqual(a);
            // Check dates' integer values.
            if ($.isDate(a) && $.isDate(b)) return a.getTime() === b.getTime();
            // Both are NaN?
            if ($.isNaN(a) && $.isNaN(b)) return false;
            // Compare regular expressions.
            if ($.isRegExp(a) && $.isRegExp(b))
                return a.source === b.source &&
                       a.global === b.global &&
                       a.ignoreCase === b.ignoreCase &&
                       a.multiline === b.multiline;
            // If a is not an object by this point, we can't handle it.
            if (atype !== 'object') return false;
            // Check for different array lengths before comparing contents.
            if (a.length && (a.length !== b.length)) return false;
            // Nothing else worked, deep compare the contents.
            var aKeys = _.keys(a), bKeys = _.keys(b);
            // Different object sizes?
            if (aKeys.length != bKeys.length) return false;
            // Recursive comparison of contents.
            for (var key in a) if (!(key in b) || !$.isEqual(a[key], b[key])) return false;
            return true;
        },
        
        // Is a given array or object empty?
        isEmpty: function(obj) {
            return $.isEmptyObject(obj);
        },
        
        // Is a given value a DOM element?
        isElement: function(obj) {
            return !!(obj && obj.nodeType == 1);
        },
        
        // Is a given variable an object?
        isObject: function(obj) {
            return obj === Object(obj);
        },
        
        // Is a given variable an arguments object?
        isArguments: function(obj) {
            return !!(obj && hasOwnProperty.call(obj, 'callee'));
        },
        
        // Is a given value a string?
        isString: function(obj) {
            return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
        },
        
        // Is a given value a number?
        isNumber: function(obj) {
            return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
        },
        
        // Is the given value NaN? NaN happens to be the only value in JavaScript
        // that does not equal itself.
        isNaN : function(obj) {
            return obj !== obj;
        },
        
        // Is a given value a boolean?
        isBoolean: function(obj) {
            return obj === true || obj === false;
        },
        
        // Is a given value a date?
        isDate : function(o) {
            return !!(o && o.getTimezoneOffset && o.setUTCFullYear);
        },
        
        // Is the given value a regular expression?
        isRegExp : function(o) {
            return !!(o && o.test && o.exec && (o.ignoreCase || o.ignoreCase === false));
        },
        
        // Is a given value equal to null?
        isNull: function(obj) {
            return obj === null;
        },
        
        // Is a given value undefined?
        isUndefined: function(obj) {
            return obj === void 0;
        },
        
        // Utility Functions
        // -----------------
        
        // Identity function for iterators.
        identity: function(v) {
            return v;
        },
        
        // Run a function **n** times.
        times: function(n, iterator, context) {
            for (var i = 0; i < n; i++) iterator.call(context || this, i);
        },
        
        // Generate a unique integer id (unique within the entire client session).
        uniqueId: function(p) {
            idCounter++;
            return p ? p + idCounter : idCounter;
        }
    });

    
    $.Stachl = {};

    $.extend($.Stachl, {
        // version number
        VERSION : '0.1b',

        // date settings
        SHORTDATE : "M/d/yyyy",
        LONGDATE : "dddd, MMMM dd, yyyy",
        SHORTTIME : "h:mm tt",
        LONGTIME : "h:mm:ss tt",
        FULLDATETIME : "dddd, MMMM dd, yyyy h:mm:ss tt",
        SORTABLEDATETIME : "yyyy-MM-ddTHH:mm:ss",
        UNIVERSALSORTABLEDATETIME : "yyyy-MM-dd HH:mm:ssz",
        RFC1123 : "ddd, dd MMM yyyy HH:mm:ss GMT",
        MONTHDATE : "MMMM dd",
        YEARMONTH : "MMMM, yyyy",
        SERVERDATE : 'yyyy-MM-ddTHH:mm:ss.uuz',

        // debug function
        debug : function() {
            // Forward to the log function
            this.log.apply(this, arguments);
        },
        log : function() {
            if(window.console && window.console.log)
                window.console.log.apply(this, arguments);
            if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.log)
                air.Introspector.Console.log.apply(this, arguments);
        },
        warn : function() {
            if(window.console && window.console.warn)
                window.console.warn.apply(this, arguments);
            if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.warn)
                air.Introspector.Console.warn.apply(this, arguments);
        },
        info : function() {
            if(window.console && window.console.info)
                window.console.info.apply(this, arguments);
            if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.info)
                air.Introspector.Console.info.apply(this, arguments);
        },
        error : function() {
            if(window.console && window.console.error)
                window.console.error.apply(this, arguments);
            if(air && air.Introspector && air.Introspector.Console && air.Introspector.Console.error)
                air.Introspector.Console.error.apply(this, arguments);
        },
    });
    */

})();
