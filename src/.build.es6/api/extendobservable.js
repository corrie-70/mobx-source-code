import { asCreateObservableOptions, asObservableObject, computedDecorator, deepDecorator, endBatch, fail, invariant, isComputed, isObservable, isObservableMap, refDecorator, startBatch } from "../internal";
export function extendObservable(target, properties, decorators, options) {
    if (process.env.NODE_ENV !== "production") {
        invariant(arguments.length >= 2 && arguments.length <= 4, "'extendObservable' expected 2-4 arguments");
        invariant(typeof target === "object", "'extendObservable' expects an object as first argument");
        invariant(!isObservableMap(target), "'extendObservable' should not be used on maps, use map.merge instead");
    }
    options = asCreateObservableOptions(options); // 检测配置信息有没有被非法修改
    const defaultDecorator = getDefaultDecoratorFromObjectOptions(options);
    // 给空对象追加$mobx属性，其值为ObservableObjectAdministration类型对象
    asObservableObject(target, options.name, defaultDecorator.enhancer); // make sure object is observable, even without initial props
    if (properties)
        extendObservableObjectWithProperties(target, properties, decorators, defaultDecorator);
    return target;
}
export function getDefaultDecoratorFromObjectOptions(options) {
    return options.defaultDecorator || (options.deep === false ? refDecorator : deepDecorator);
}
export function extendObservableObjectWithProperties(target, properties, decorators, defaultDecorator) {
    if (process.env.NODE_ENV !== "production") {
        invariant(!isObservable(properties), "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540");
        if (decorators)
            for (let key in decorators)
                if (!(key in properties))
                    fail(`Trying to declare a decorator for unspecified property '${key}'`);
    }
    startBatch();
    try {
        for (let key in properties) {
            const descriptor = Object.getOwnPropertyDescriptor(properties, key);
            if (process.env.NODE_ENV !== "production") {
                if (Object.getOwnPropertyDescriptor(target, key))
                    fail(`'extendObservable' can only be used to introduce new properties. Use 'set' or 'decorate' instead. The property '${key}' already exists on '${target}'`);
                if (isComputed(descriptor.value))
                    fail(`Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead`);
            }
            const decorator = decorators && key in decorators
                ? decorators[key]
                : descriptor.get
                    ? computedDecorator
                    : defaultDecorator;
            if (process.env.NODE_ENV !== "production" && typeof decorator !== "function")
                fail(`Not a valid decorator for '${key}', got: ${decorator}`);
            const resultDescriptor = decorator(target, key, descriptor, true);
            if (resultDescriptor // otherwise, assume already applied, due to `applyToInstance`
            )
                Object.defineProperty(target, key, resultDescriptor);
        }
    }
    finally {
        endBatch();
    }
}
