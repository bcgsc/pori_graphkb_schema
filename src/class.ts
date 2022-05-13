import {
    ClassDefinition, PropertyDefinition, ClassDefinitionInput, Expose, ClassPermissions, GroupName,
} from './types';
import { createPropertyDefinition } from './property';
import {
    EXPOSE_ALL, EXPOSE_EDGE, EXPOSE_NONE, PERMISSIONS,
} from './constants';

const getRouteName = (name: string, isEdge: boolean) => {
    if (name.length === 1) {
        return `/${name.toLowerCase()}`;
    } if (!isEdge && !name.endsWith('ary') && name.toLowerCase() !== 'evidence') {
        if (/.*[^aeiou]y$/.exec(name)) {
            return `/${name.slice(0, name.length - 1)}ies`.toLowerCase();
        }
        return `/${name}s`.toLowerCase();
    }
    return `/${name.toLowerCase()}`;
};

const defaultPermissions = (routes: Partial<Expose> = {}): ClassPermissions => {
    const permissions = {
        default: PERMISSIONS.NONE,
        readonly: PERMISSIONS.READ,
    };

    if (routes.QUERY || routes.GET) {
        permissions.default |= PERMISSIONS.READ;
    }
    if (routes.POST) {
        permissions.default |= PERMISSIONS.CREATE;
    }
    if (routes.PATCH) {
        permissions.default |= PERMISSIONS.UPDATE;
    }
    if (routes.DELETE) {
        permissions.default |= PERMISSIONS.DELETE;
    }
    return permissions;
};

const createClassDefinition = (opt: ClassDefinitionInput): ClassDefinition => {
    const { name } = opt;
    const properties: Record<string, PropertyDefinition> = {};

    for (const propDefn of opt.properties || []) {
        properties[propDefn.name] = createPropertyDefinition(propDefn);
    }

    let isEdge = Boolean(opt.isEdge);

    if (opt.targetModel || opt.sourceModel) {
        isEdge = true;
    }

    let defaultRoutes: Expose;

    if (opt.isAbstract || opt.embedded) {
        defaultRoutes = EXPOSE_NONE;
    } else if (opt.isEdge) {
        defaultRoutes = EXPOSE_EDGE;
    } else {
        defaultRoutes = EXPOSE_ALL;
    }

    const routes = opt.routes || defaultRoutes || {};

    return {
        ...opt,
        properties,
        routeName: getRouteName(opt.name, Boolean(opt.isEdge)),
        isEdge,
        routes,
        isAbstract: Boolean(opt.isAbstract),
        inherits: opt.inherits || [],
        description: opt.description || '',
        embedded: Boolean(opt.embedded),
        indices: opt.indices || [],
        permissions: { ...defaultPermissions(routes), ...(opt.permissions || {}) },
    };
};

export { createClassDefinition, getRouteName };
