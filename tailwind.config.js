export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#eff6ff",
                    100: "#dbeafe",
                    500: "#2563eb",
                    700: "#1d4ed8",
                    900: "#1e3a8a",
                },
            },
            boxShadow: {
                panel: "0 20px 45px -25px rgba(15, 23, 42, 0.35)",
            },
        },
    },
    plugins: [],
};
