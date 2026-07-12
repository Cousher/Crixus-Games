# Crixus Games - Premium Casino Platform

Plataforma de casino online moderna y de alto rendimiento. Construida con un stack tecnológico robusto e interfaces de usuario premium que compiten con los estándares más altos de la industria (Roobet, Stake, BC.Game).

## 🚀 Características Principales

*   **Juegos "Originals" Nativos:** 
    *   **Crash:** Multiplicadores dinámicos gigantes, fondos de cuadrícula de neón acelerada, estelas de vuelo luminosas y efectos de temblor (Screen Shake).
    *   **Slots (Tragamonedas):** Rodillos impulsados por motor de físicas `framer-motion`, símbolos que "resaltan" en 3D al ganar, y explosiones vectoriales (Lottie) en premios grandes (Big Win).
    *   **Coin Flip / Buscaminas:** (En constante actualización).
*   **Diseño Institucional:** Panel de control de usuario (Profile) estilo Dashboard con tarjetas (Cards) elegantes para métricas de balance, experiencia (XP) y bonos diarios.
*   **Soporte Multilingüe (i18n):** Totalmente localizado en Español e Inglés mediante `react-i18next`.
*   **Microinteracciones Premium:** Físicas 3D en botones e ítems del mercado (Magic UI y Aceternity UI style).

## 🛠 Stack Tecnológico

*   **Frontend:** ReactJS + Vite + TypeScript + TailwindCSS.
*   **Animaciones:** `framer-motion` (Físicas UI) y `lottie-react` (Explosiones complejas sin video).
*   **Backend:** NodeJS + Express + WebSockets (Socket.io).
*   **Despliegue:** Preparado para servidores Linux (VPS) utilizando `PM2` para la gestión de procesos.

## ⚙️ Comandos de Producción (VPS)

Para desplegar las últimas actualizaciones desde la rama principal y reiniciar los servicios en el servidor Ubuntu, ejecutá:

```bash
cd /var/www/kani && git pull origin main && npm install && npm run build && pm2 restart all
```

## 💻 Desarrollo Local

1. Cloná el repositorio y navegá a la carpeta raíz.
2. Ejecutá `npm install` para instalar todas las dependencias.
3. Configurá tus variables de entorno creando un archivo `.env` basado en el entorno de pruebas o producción.
4. Iniciá el entorno de desarrollo del frontend con `npm run dev`.
5. Si querés levantar el backend, navegá a la carpeta `/backend`, ejecutá `npm install`, configura tu `.env` (MongoDB, JWT_SECRET, PORT) y usá `npm run start`.

---
*Este proyecto es una evolución constante centrada en el diseño visual de primera clase y la estabilidad matemática pura.*
