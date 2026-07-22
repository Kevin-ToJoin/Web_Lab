// ─── Bilingual dictionary (ES / EN) ────────────────────────────────────────────
// Technical terms are intentionally left untranslated in BOTH languages —
// e.g. "bug", "API", "GET", "PUT", "endpoint", "checkout", "Docker", "REVEAL".
// That mirrors how QA teams actually speak: the tech vocabulary stays in English.
//
// Add a key here with both `en` and `es`, then read it via `t('key')` from
// `useI18n()`. `{placeholders}` are filled from the vars object passed to `t`.

export type Lang = 'es' | 'en';

export const strings: Record<string, { en: string; es: string }> = {
  // ── Hub ──────────────────────────────────────────────────────────────────
  'hub.subtitle': {
    en: 'A professional sandbox for QA engineers. Choose an environment and discover intentionally injected bugs — from trivial to impossible.',
    es: 'Un entorno profesional para ingenieros QA. Elige una aplicación y descubre bugs inyectados a propósito — de triviales a imposibles.',
  },
  'hub.badge': {
    en: '🐛 {n} intentionally injected bugs across {apps} apps',
    es: '🐛 {n} bugs inyectados a propósito en {apps} apps',
  },
  'hub.howTitle': { en: 'How to use this lab', es: 'Cómo usar este laboratorio' },
  'hub.how1': {
    en: 'Pick an environment below — start with Product Catalog if you are new.',
    es: 'Elige una aplicación abajo — empieza con Catálogo de productos si eres nuevo.',
  },
  'hub.how2': {
    en: 'Use the QA Inspector panel on the right to read requirements and inspect data.',
    es: 'Usa el panel QA Inspector de la derecha para leer los requisitos e inspeccionar los datos.',
  },
  'hub.how3': {
    en: 'Find the bugs by testing the UI against the listed acceptance criteria.',
    es: 'Encuentra los bugs probando la UI contra los criterios de aceptación listados.',
  },
  'hub.how4': {
    en: 'Document each bug as you would in a real bug report (title, steps, expected vs. actual).',
    es: 'Documenta cada bug como en un reporte real (título, pasos, esperado vs. actual).',
  },
  'hub.start': { en: 'Start Testing', es: 'Empezar a probar' },
  'hub.bugs': { en: '🐛 {n} bugs', es: '🐛 {n} bugs' },
  'hub.levels': { en: 'Levels', es: 'Niveles' },
  'hub.level': { en: 'Level', es: 'Nivel' },

  // Difficulty labels
  'diff.Easy': { en: 'Easy', es: 'Fácil' },
  'diff.Medium': { en: 'Medium', es: 'Medio' },
  'diff.Hard': { en: 'Hard', es: 'Difícil' },
  'diff.Expert': { en: 'Expert', es: 'Experto' },
  'diff.Impossible': { en: 'Impossible', es: 'Imposible' },

  // Per-app titles & descriptions (brand names in parentheses stay as-is)
  'app.catalog.title': { en: 'Product Catalog', es: 'Catálogo de productos' },
  'app.catalog.desc': {
    en: 'Basic observation & UI bugs. Great starting point for beginners.',
    es: 'Observación básica y bugs de UI. Buen punto de partida para principiantes.',
  },
  'app.ecommerce.title': { en: 'E-commerce Store', es: 'Tienda E-commerce' },
  'app.ecommerce.desc': {
    en: 'Boundary value & equivalence partitioning bugs in cart and checkout.',
    es: 'Bugs de valores límite y particiones de equivalencia en el carrito y el checkout.',
  },
  'app.registration.title': { en: 'Registration Portal', es: 'Portal de registro' },
  'app.registration.desc': {
    en: 'Multi-step form with state bugs',
    es: 'Formulario multi-paso con bugs de estado',
  },
  'app.bank.title': { en: 'Bank Core System', es: 'Core bancario' },
  'app.bank.desc': {
    en: 'State transitions, session management & async submission bugs.',
    es: 'Transiciones de estado, gestión de sesión y bugs de envíos asíncronos.',
  },
  'app.healthcare.title': { en: 'Patient Portal', es: 'Portal del paciente' },
  'app.healthcare.desc': {
    en: 'Decision table logic, complex date validation & unreachable branches.',
    es: 'Tablas de decisión, validación de fechas compleja y ramas inalcanzables.',
  },
  'app.trading.title': { en: 'Trading Dashboard', es: 'Panel de trading' },
  'app.trading.desc': {
    en: 'Race conditions, floating-point cascades & timezone offset bugs.',
    es: 'Condiciones de carrera, cascadas de coma flotante y bugs de zona horaria.',
  },
  'app.hotel.title': { en: 'Hotel Booking (StayEasy)', es: 'Reserva de hotel (StayEasy)' },
  'app.hotel.desc': {
    en: 'Date-range logic, occupancy limits, pricing math & overbooking.',
    es: 'Rangos de fechas, límites de ocupación, cálculo de precios y overbooking.',
  },
  'app.delivery.title': { en: 'Food Delivery (QuickBite)', es: 'Comida a domicilio (QuickBite)' },
  'app.delivery.desc': {
    en: 'Delivery zones, time windows, order minimums, promo stacking & tip math.',
    es: 'Zonas de entrega, franjas horarias, mínimos de pedido, promos apilables y cálculo de propina.',
  },
  'app.exam.title': { en: 'Online Exam (CertifyHub)', es: 'Examen online (CertifyHub)' },
  'app.exam.desc': {
    en: 'Timer/auto-submit, pass-cutoff boundaries, scoring & negative marking.',
    es: 'Temporizador/auto-envío, notas de corte, puntaje y penalización.',
  },
  'app.insurance.title': { en: 'Insurance Quote (SecureQuote)', es: 'Cotización de seguro (SecureQuote)' },
  'app.insurance.desc': {
    en: 'Multi-factor decision tables, premium multipliers & discount clamps.',
    es: 'Tablas de decisión multifactor, multiplicadores de prima y topes de descuento.',
  },
  'app.auth.title': { en: 'Account Security (VaultAuth)', es: 'Seguridad de cuenta (VaultAuth)' },
  'app.auth.desc': {
    en: 'Password strength, token expiry, rate-limit lockout, sessions & 2FA.',
    es: 'Fuerza de contraseña, expiración de token, bloqueo por rate-limit, sesiones y 2FA.',
  },
  'app.mobile.title': { en: 'Mobile Wallet (MobiTap)', es: 'Billetera móvil (MobiTap)' },
  'app.mobile.desc': {
    en: 'Mobile UX bugs: touch targets, viewport overflow, input types, gestures & a11y.',
    es: 'Bugs de UX móvil: áreas táctiles, overflow de viewport, tipos de input, gestos y a11y.',
  },

  // ── QA Inspector ─────────────────────────────────────────────────────────
  'qa.title': { en: 'QA Inspector', es: 'QA Inspector' },
  'tab.reqs': { en: 'Reqs', es: 'Reqs' },
  'tab.db': { en: 'DB', es: 'DB' },
  'tab.api': { en: 'API', es: 'API' },
  'tab.apilab': { en: 'API Lab', es: 'API Lab' },
  'tab.solutions': { en: 'Solutions', es: 'Soluciones' },
  'reqs.empty': {
    en: 'No requirements loaded for this page.',
    es: 'No hay requisitos cargados para esta página.',
  },
  'db.empty': {
    en: 'No database tables loaded for this view.',
    es: 'No hay tablas de base de datos cargadas para esta vista.',
  },
  'api.empty': { en: 'No API endpoints for this view.', es: 'No hay endpoints de API para esta vista.' },
  'sol.empty': {
    en: 'No solutions defined for this page yet.',
    es: 'Aún no hay soluciones definidas para esta página.',
  },

  // ── API Lab tab ──────────────────────────────────────────────────────────
  'lab.title': { en: '🐳 API & Data lab', es: '🐳 Laboratorio de API y datos' },
  'lab.intro': {
    en: 'This module also ships a real backend you run on your own computer — a live API and database — to practise testing that a mocked UI cannot teach: HTTP status codes, SQL/data integrity, search, pagination and reviews.',
    es: 'Este módulo también trae un backend real que corres en tu propia computadora — una API y una base de datos en vivo — para practicar pruebas que una UI simulada no enseña: códigos de estado HTTP, integridad de datos SQL, búsqueda, paginación y reviews.',
  },
  'lab.bugs': { en: '{n} injected bugs', es: '{n} bugs inyectados' },
  'lab.runTitle': { en: 'Run it in one command', es: 'Córrelo con un solo comando' },
  'lab.step1pre': { en: 'Install', es: 'Instala' },
  'lab.step1post': { en: '(one time).', es: '(una sola vez).' },
  'lab.step2': {
    en: "Download this module's docker-compose.yml into an empty folder.",
    es: 'Descarga el docker-compose.yml de este módulo en una carpeta vacía.',
  },
  'lab.step3': { en: 'Open a terminal there and run:', es: 'Abre una terminal ahí y ejecuta:' },
  'lab.thenOpen': { en: 'Then open', es: 'Luego abre' },
  'lab.rules': { en: "the API's rules", es: 'las reglas de la API' },
  'lab.adminer': { en: 'Adminer (browse the database)', es: 'Adminer (explora la base de datos)' },
  'lab.download': { en: '⬇ Download docker-compose.yml', es: '⬇ Descargar docker-compose.yml' },
  'lab.footer': {
    en: 'Save it into an empty folder, then run docker compose up there. File your findings with Report Bug, or reveal the tagged answers at',
    es: 'Guárdalo en una carpeta vacía y ejecuta docker compose up ahí. Reporta tus hallazgos con Report Bug, o revela las respuestas etiquetadas en',
  },

  // ── Solutions lock ───────────────────────────────────────────────────────
  'lock.title': { en: 'Solutions are locked', es: 'Las soluciones están bloqueadas' },
  'lock.desc': {
    en: 'Attempt the exercises first. Ask your instructor for the unlock code (a single English word meaning "to expose").',
    es: 'Intenta los ejercicios primero. Pide a tu instructor el código de desbloqueo (una sola palabra en inglés que significa "exponer").',
  },
  'lock.placeholder': { en: 'Enter unlock code', es: 'Escribe el código' },
  'lock.button': { en: 'Unlock', es: 'Desbloquear' },
  'lock.wrong': { en: 'Incorrect code. Try again.', es: 'Código incorrecto. Inténtalo de nuevo.' },
};
