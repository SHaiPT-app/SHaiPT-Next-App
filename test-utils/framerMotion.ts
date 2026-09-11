/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
/**
 * One framer-motion mock, shared.
 *
 * Twenty-two suites each wrote their own, and two of them — the pair covering AICoachChat —
 * provided `motion.create` and `AnimatePresence` but nothing for `motion.div`. `motion` is not an
 * object with a fixed set of keys: every tag is a property, resolved on access. So `motion.div`
 * came back `undefined`, React was handed `undefined` as an element type, and all 24 tests died on
 * render with "Element type is invalid ... you might have mixed up default and named imports" —
 * which points at imports and had nothing to do with them.
 *
 * A Proxy is the fix, because it answers for any tag rather than the handful somebody remembered
 * to list. Add a `motion.section` to a component tomorrow and nothing here needs touching.
 *
 * Use it from a test like this — the require has to be inside the factory, because jest.mock is
 * hoisted above the imports:
 *
 *     jest.mock('framer-motion', () => require('@/test-utils/framerMotion').createFramerMotionMock());
 */

/** Animation props that must not reach the DOM, or React warns about unknown attributes. */
const MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'custom', 'layout', 'layoutId',
    'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'viewport',
    'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
    'onAnimationStart', 'onAnimationComplete', 'onViewportEnter', 'onViewportLeave',
    'style',
]);

/** Chakra style props, left over from the UI library this app used to be built on. */
const CHAKRA_PROPS = new Set([
    'px', 'py', 'pt', 'pb', 'pl', 'pr', 'p', 'm', 'mx', 'my', 'mb', 'mt', 'ml', 'mr',
    'gap', 'bg', 'bgColor', 'borderRadius', 'borderBottom', 'borderTop', 'borderColor', 'border',
    'alignItems', 'justifyContent', 'flexShrink', 'flexDirection', 'flexWrap',
    'overflowY', 'overflowX', 'overflow', 'textTransform', 'letterSpacing', 'lineClamp',
    'lineHeight', 'whiteSpace', 'fontFamily', 'fontWeight', 'fontSize', 'textAlign',
    'maxH', 'maxW', 'minH', 'minW', 'width', 'height', 'w', 'h',
    'position', 'bottom', 'right', 'top', 'left', 'zIndex',
    'backdropFilter', 'boxShadow', 'color', 'display', 'flex', 'animation', 'align',
]);

export function createFramerMotionMock() {
    const React = require('react');

    /** A plain host element that drops the animation props and keeps everything else. */
    function motionComponent(tag: any) {
        const Component = React.forwardRef((props: Record<string, any>, ref: any) => {
            const { children, ...rest } = props;
            const passthrough: Record<string, any> = {};
            for (const [key, value] of Object.entries(rest)) {
                if (MOTION_PROPS.has(key) || CHAKRA_PROPS.has(key)) continue;
                passthrough[key] = value;
            }
            return React.createElement(tag, { ...passthrough, ref }, children);
        });
        Component.displayName = `motion.${typeof tag === 'string' ? tag : 'component'}`;
        return Component;
    }

    // Same tag, same component identity — otherwise every render remounts the subtree and
    // anything holding state inside it loses it between assertions.
    const cache = new Map<string, unknown>();

    const motion: any = new Proxy(
        {},
        {
            get(_target, prop) {
                if (typeof prop !== 'string') return undefined;
                // motion.create(Foo) wraps a component rather than naming a tag.
                if (prop === 'create') {
                    return (component: any) => motionComponent(typeof component === 'string' ? component : component ?? 'div');
                }
                if (!cache.has(prop)) cache.set(prop, motionComponent(prop));
                return cache.get(prop);
            },
        },
    );

    const passthroughValue = (value: number) => ({
        get: () => value,
        set: () => {},
        on: () => () => {},
        onChange: () => () => {},
    });

    return {
        __esModule: true,
        motion,
        // Renders children immediately: there is no exit animation to wait for in a test.
        AnimatePresence: ({ children }: { children: any }) => React.createElement(React.Fragment, null, children),
        LazyMotion: ({ children }: { children: any }) => React.createElement(React.Fragment, null, children),
        MotionConfig: ({ children }: { children: any }) => React.createElement(React.Fragment, null, children),
        domAnimation: {},
        domMax: {},
        useReducedMotion: () => false,
        useMotionValue: (initial = 0) => passthroughValue(initial),
        useTransform: () => passthroughValue(0),
        useSpring: (initial = 0) => passthroughValue(typeof initial === 'number' ? initial : 0),
        useScroll: () => ({ scrollX: passthroughValue(0), scrollY: passthroughValue(0), scrollXProgress: passthroughValue(0), scrollYProgress: passthroughValue(0) }),
        // In jsdom nothing has layout, so "in view" is the useful answer — it is what lets
        // scroll-revealed content be asserted on at all.
        useInView: () => true,
        useAnimation: () => ({ start: () => Promise.resolve(), stop: () => {}, set: () => {} }),
        useAnimationControls: () => ({ start: () => Promise.resolve(), stop: () => {}, set: () => {} }),
    };
}
