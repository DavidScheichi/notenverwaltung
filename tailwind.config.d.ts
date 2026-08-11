declare const _default: {
    content: string[];
    theme: {
        extend: {
            fontFamily: {
                sans: [string, string, string, string, string, string, string, string, string];
            };
            colors: {
                brand: {
                    50: string;
                    100: string;
                    500: string;
                    700: string;
                    900: string;
                };
                canvas: string;
                surface: string;
                sunken: string;
                line: string;
                "line-strong": string;
                ink: string;
                "ink-2": string;
                "ink-3": string;
                accent: string;
                "accent-soft": string;
                "accent-strong": string;
                "accent-ring": string;
            };
            boxShadow: {
                panel: string;
                card: string;
                overlay: string;
            };
            keyframes: {
                "toast-in": {
                    from: {
                        opacity: string;
                        transform: string;
                    };
                    to: {
                        opacity: string;
                        transform: string;
                    };
                };
                "overlay-in": {
                    from: {
                        opacity: string;
                    };
                    to: {
                        opacity: string;
                    };
                };
                "sheet-in": {
                    from: {
                        opacity: string;
                        transform: string;
                    };
                    to: {
                        opacity: string;
                        transform: string;
                    };
                };
            };
            animation: {
                "toast-in": string;
                "overlay-in": string;
                "sheet-in": string;
            };
        };
    };
    plugins: any[];
};
export default _default;
