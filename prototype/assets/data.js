/* ============================================================
   ragcooking.info — catálogo semilla del prototipo (Hito 0)
   Todo es dato: fases, piezas, capacidades, plantillas y glosario.
   El motor (editor.js) es genérico sobre estos datos.
   ============================================================ */

const ESTACIONES = [
  { id: 'aprovisionamiento', nombre: 'Aprovisionamiento', sub: 'La compra',        color: '#D9A02B', icon: 'shopping-basket' },
  { id: 'preparacion',       nombre: 'Preparación',      sub: 'Mise en place',     color: '#6B8E4E', icon: 'chef-hat' },
  { id: 'coccion',           nombre: 'Cocción',          sub: 'Cocinar y guardar', color: '#C14B2E', icon: 'flame' },
  { id: 'servicio',          nombre: 'Servicio',         sub: 'Emplatar y servir', color: '#4A6FA5', icon: 'utensils' },
  { id: 'calidad',           nombre: 'Calidad y gobierno', sub: 'El crítico',      color: '#8A5A83', icon: 'clipboard-check' },
];

const FASES = [
  { id: 'modelo',         est: 'aprovisionamiento', nivel: 'recomendada', icon: 'sitemap',       nombre: 'Modelo de conocimiento', desc: 'Dominios y etiquetas con descripción. Se diseña ANTES de ingestar.' },
  { id: 'corpus',         est: 'aprovisionamiento', nivel: 'obligatoria', icon: 'folder-open',   nombre: 'Corpus',                 desc: 'Fuentes del conocimiento: ficheros, web, APIs, MCPs…' },
  { id: 'ingesta',        est: 'aprovisionamiento', nivel: 'obligatoria', icon: 'download',      nombre: 'Ingesta',                desc: 'Extracción y carga: lectores de formato, OCR, scrapers.' },
  { id: 'limpieza',       est: 'aprovisionamiento', nivel: 'recomendada', icon: 'paintbrush',    nombre: 'Limpieza',               desc: 'Normalización, deduplicación, corrección, calidad.' },
  { id: 'estructura',     est: 'preparacion',       nivel: 'opcional',    icon: 'layers',        nombre: 'Estructura',             desc: 'Segmentación y clasificación por dominios y tipos documentales.' },
  { id: 'transversales',  est: 'preparacion',       nivel: 'opcional',    icon: 'link',          nombre: 'Transversales',         desc: 'Hilado de documentos: conceptos con respuesta en chunks de distintos dominios.' },
  { id: 'chunking',       est: 'preparacion',       nivel: 'obligatoria', icon: 'scissors',      nombre: 'Chunking',               desc: 'La píldora de información: fija, semántica, por estructura, jerárquica.' },
  { id: 'metaetiquetado', est: 'preparacion',       nivel: 'recomendada', icon: 'tags',          nombre: 'Metaetiquetado',        desc: 'Metadatos por chunk: dominio, tags, vigencia, seguridad, linaje.' },
  { id: 'sintesis',       est: 'preparacion',       nivel: 'opcional',    icon: 'sparkles',      nombre: 'Síntesis',               desc: 'Resúmenes con LLM de chunks o documentos (doble campo).' },
  { id: 'embedding',      est: 'coccion',           nivel: 'obligatoria', icon: 'atom',          nombre: 'Embedding',              desc: 'Modelos de embedding: multilingües, de dominio, dimensiones…' },
  { id: 'almacenamiento', est: 'coccion',           nivel: 'obligatoria', icon: 'database',      nombre: 'Almacenamiento',        desc: 'BD vectorial, índice léxico (BM25), híbrido, metadatos filtrables.' },
  { id: 'ruido',          est: 'coccion',           nivel: 'recomendada', icon: 'activity',      nombre: 'Medición de ruido',     desc: 'Detectar chunks que se tropiezan con búsquedas de dominios no alineados.' },
  { id: 'framework',      est: 'servicio',          nivel: 'obligatoria', icon: 'wrench',        nombre: 'Framework',             desc: 'LangChain, LlamaIndex, ragkit, nucleus, custom…' },
  { id: 'recuperacion',   est: 'servicio',          nivel: 'obligatoria', icon: 'search',        nombre: 'Recuperación',          desc: 'Densa, sparse, híbrida, prefiltro determinista por metadatos.' },
  { id: 'reranking',      est: 'servicio',          nivel: 'recomendada', icon: 'arrow-up-wide-narrow', nombre: 'Reranking',      desc: 'Cross-encoders, rerankers, boost de transversales.' },
  { id: 'generacion',     est: 'servicio',          nivel: 'obligatoria', icon: 'bot',           nombre: 'Generación',            desc: 'LLM generador, plantillas de prompt, citas de fuentes.' },
  { id: 'evaluacion',     est: 'calidad',           nivel: 'recomendada', icon: 'target',        nombre: 'Evaluación',            desc: 'Dataset áureo, métricas (recall, precisión), umbral de aceptación.' },
  { id: 'gobierno',       est: 'calidad',           nivel: 'opcional',    icon: 'shield',        nombre: 'Gobierno',              desc: 'Frescura, ciclo de vida, coste, despliegue continuo.' },
];

/* Piezas. covers = fases que la pieza sustituye por sí sola (megapiezas si cubre >1).
   integrates = capacidad integrada opcional (la fase sigue siendo necesaria, pero
   la pieza la ofrece como alternativa). origin: comunidad | comercial | propio. */
const PIEZAS = [
  // —— modelo
  { id: 'modelo.dominios',  fase: 'modelo', nombre: 'Definir dominios',        icon: 'sitemap', level: 'core', origin: 'comunidad', covers: ['modelo'],
    tagline: 'Divide el corpus en dominios, cada uno con su descripción',
    pros: ['Enfoca el corpus', 'Habilita prefiltros por dominio'], cons: ['Requiere conocimiento del negocio'] },
  { id: 'modelo.etiquetas', fase: 'modelo', nombre: 'Taxonomía de etiquetas',  icon: 'tags', level: 'core', origin: 'comunidad', covers: ['modelo'],
    tagline: 'Etiquetas con descripción y propósito: la segunda dimensión de la búsqueda',
    pros: ['Filtros y reordenación', 'Vocabulario común del negocio'], cons: ['Mantenimiento continuo'] },

  // —— corpus
  { id: 'corpus.carpeta-pdf', fase: 'corpus', nombre: 'Carpeta de PDFs',  icon: 'folder', level: 'core', origin: 'comunidad', covers: ['corpus'],
    tagline: 'Ficheros PDF en carpetas: contratos, convenios, manuales…', pros: ['Simplicidad total'], cons: ['Sin frescura automática'] },
  { id: 'corpus.paginas-web', fase: 'corpus', nombre: 'Páginas web',      icon: 'globe', level: 'core', origin: 'comunidad', covers: ['corpus'],
    tagline: 'Contenido de URLs y sitemaps', pros: ['Siempre fresco (crawling)'], cons: ['Ruido de plantilla'] },
  { id: 'corpus.mcp',         fase: 'corpus', nombre: 'Servidores MCP',   icon: 'plug', level: 'avanzada', origin: 'comunidad', covers: ['corpus'],
    tagline: 'Orígenes expuestos como Model Context Protocol', pros: ['Estandarizado'], cons: ['Eclosión de servidores'] },
  { id: 'corpus.apis',        fase: 'corpus', nombre: 'APIs de origen',   icon: 'webhook', level: 'avanzada', origin: 'comunidad', covers: ['corpus'],
    tagline: 'APIs internas o de terceros', pros: ['Datos vivos'], cons: ['Autenticación y límites'] },
  { id: 'corpus.wiki',        fase: 'corpus', nombre: 'Wiki corporativa', icon: 'book-open', level: 'core', origin: 'comunidad', covers: ['corpus'],
    tagline: 'Confluence, Notion, MediaWiki…', pros: ['Conocimiento curado'], cons: ['Permisos heredados complejos'] },

  // —— ingesta
  { id: 'ingesta.lectores-pdf', fase: 'ingesta', nombre: 'Lectores de PDF', icon: 'file-text', level: 'core', origin: 'comunidad', covers: ['ingesta'],
    tagline: 'Extraen texto, tablas y estructura', pros: ['Maduro'], cons: ['PDFs sucios'] },
  { id: 'ingesta.ocr',          fase: 'ingesta', nombre: 'OCR',            icon: 'scan-text', level: 'avanzada', origin: 'comercial', covers: ['ingesta'],
    tagline: 'Texto de documentos escaneados', pros: ['Desbloquea papel'], cons: ['Coste y errores'] },
  { id: 'ingesta.scraper',      fase: 'ingesta', nombre: 'Scraper web',    icon: 'download', level: 'core', origin: 'comunidad', covers: ['ingesta'],
    tagline: 'Descarga y limpia HTML', pros: ['Automatizable'], cons: ['Frágil ante cambios'] },

  // —— limpieza
  { id: 'limpieza.normalizacion', fase: 'limpieza', nombre: 'Normalización', icon: 'paintbrush', level: 'core', origin: 'comunidad', covers: ['limpieza'],
    tagline: 'Unicode, mayúsculas, espacios, caracteres huérfanos', pros: ['Embeddings más limpios'], cons: ['—'] },
  { id: 'limpieza.deduplicacion', fase: 'limpieza', nombre: 'Deduplicación', icon: 'copy', level: 'core', origin: 'comunidad', covers: ['limpieza'],
    tagline: 'Detecta documentos y chunks repetidos', pros: ['Menos ruido'], cons: ['Coste computacional'] },
  { id: 'limpieza.correccion',    fase: 'limpieza', nombre: 'Corrección de calidad', icon: 'check', level: 'avanzada', origin: 'comunidad', covers: ['limpieza'],
    tagline: 'Errores de OCR, codificación, huérfanos', pros: ['Calidad del corpus'], cons: ['Requiere revisión'] },

  // —— estructura
  { id: 'estructura.por-dominios', fase: 'estructura', nombre: 'Segmentar por dominios', icon: 'layers', level: 'core', origin: 'comunidad', covers: ['estructura'],
    tagline: 'Subcorpus por dominio del modelo', pros: ['Pipelines por dominio'], cons: ['Sobrecoste operativo'] },
  { id: 'estructura.por-tipo',     fase: 'estructura', nombre: 'Clasificar por tipo documental', icon: 'folder-tree', level: 'core', origin: 'comunidad', covers: ['estructura'],
    tagline: 'Convenio, sentencia, manual, política…', pros: ['Chunking por tipo'], cons: ['Taxonomía previa'] },

  // —— transversales
  { id: 'transversales.hilado', fase: 'transversales', nombre: 'Hilado de documentos', icon: 'link', level: 'avanzada', origin: 'comunidad', covers: ['transversales'],
    tagline: 'Documentos transversales que enlazan chunks de varios dominios; peso extra en rerank',
    pros: ['Conceptos multi-dominio resueltos', 'Mejor rerank'], cons: ['Mantenimiento humano'] },
  { id: 'transversales.mapa-conceptos', fase: 'transversales', nombre: 'Mapa de conceptos', icon: 'network', level: 'avanzada', origin: 'comunidad', covers: ['transversales'],
    tagline: 'Inventario de conceptos multi-dominio: qué concepto vive en qué dominios',
    pros: ['Guía el hilado', 'Detecta huecos'], cons: ['Elaboración inicial'] },

  // —— chunking
  { id: 'chunking.fijo',       fase: 'chunking', nombre: 'Chunking fijo',            icon: 'scissors', level: 'core', origin: 'comunidad', covers: ['chunking'],
    tagline: 'Tamaño y overlap fijos (p. ej. 512 tokens, 15%)', pros: ['Simple y rápido'], cons: ['Corta ideas por la mitad'] },
  { id: 'chunking.semantico',  fase: 'chunking', nombre: 'Chunking semántico',       icon: 'brain', level: 'core', origin: 'comunidad', covers: ['chunking'],
    tagline: 'Corta donde el texto cambia de tema', pros: ['Chunks coherentes'], cons: ['Más coste de proceso'] },
  { id: 'chunking.estructura', fase: 'chunking', nombre: 'Por estructura',           icon: 'list', level: 'core', origin: 'comunidad', covers: ['chunking'],
    tagline: 'Respeta secciones, artículos, cláusulas', pros: ['Perfecto para normativa'], cons: ['Documentos bien formados'] },
  { id: 'chunking.jerarquico', fase: 'chunking', nombre: 'Jerárquico (padre-hijo)',  icon: 'git-branch', level: 'avanzada', origin: 'comunidad', covers: ['chunking'],
    tagline: 'Chunks pequeños que recuerdan a su padre', pros: ['Contexto amplio'], cons: ['Índice doble'] },

  // —— metaetiquetado
  { id: 'metaetiquetado.dominio-tags', fase: 'metaetiquetado', nombre: 'Dominio + tags',        icon: 'tags', level: 'core', origin: 'comunidad', covers: ['metaetiquetado'],
    tagline: 'Cada chunk lleva su dominio y etiquetas', pros: ['Prefiltro potente'], cons: ['—'] },
  { id: 'metaetiquetado.seguridad',    fase: 'metaetiquetado', nombre: 'Metadatos de seguridad', icon: 'lock', level: 'core', origin: 'comunidad', covers: ['metaetiquetado'],
    tagline: 'tenant, empresa, grupo, rol, país, clasificación — modelar ANTES de ingestar',
    pros: ['Filtro determinista', 'Seguridad auditable'], cons: ['Re-catalogar si llega tarde'] },
  { id: 'metaetiquetado.vigencia',     fase: 'metaetiquetado', nombre: 'Vigencia y versionado',  icon: 'calendar-clock', level: 'core', origin: 'comunidad', covers: ['metaetiquetado'],
    tagline: 'Fechas de vigencia y versión para descartar lo caducado', pros: ['Respuestas vigentes'], cons: ['Disciplina de datos'] },

  // —— sintesis
  { id: 'sintesis.resumen-llm', fase: 'sintesis', nombre: 'Resumen con LLM', icon: 'sparkles', level: 'avanzada', origin: 'comunidad', covers: ['sintesis'],
    tagline: 'Doble campo: resumen firmado + texto original', pros: ['Chunks digestivos'], cons: ['Coste de síntesis'] },
  { id: 'sintesis.por-dominio', fase: 'sintesis', nombre: 'Síntesis por dominio', icon: 'sticky-note', level: 'avanzada', origin: 'comunidad', covers: ['sintesis'],
    tagline: 'Una síntesis firmada por experto por cada dominio del corpus (Gold)',
    pros: ['Contradicciones resueltas por humanos'], cons: ['Requiere expertos'] },

  // —— embedding
  { id: 'embedding.bge-m3',       fase: 'embedding', nombre: 'BGE-M3',                  icon: 'atom', level: 'core', origin: 'comunidad', covers: ['embedding'],
    tagline: 'Multilingüe, abierto, 8k contexto', pros: ['Gratis y local'], cons: ['Dimensiones grandes'] },
  { id: 'embedding.openai',       fase: 'embedding', nombre: 'text-embedding-3 (OpenAI)', icon: 'atom', level: 'core', origin: 'comercial', covers: ['embedding'],
    tagline: 'API comercial de OpenAI', pros: ['Calidad sólida'], cons: ['Coste por token'] },
  { id: 'embedding.cohere',       fase: 'embedding', nombre: 'Cohere embed',            icon: 'atom', level: 'core', origin: 'comercial', covers: ['embedding'],
    tagline: 'Fuerte en multilingüe', pros: ['Buen ES/EN'], cons: ['API externa'] },
  { id: 'embedding.sentence-transformers', fase: 'embedding', nombre: 'sentence-transformers', icon: 'atom', level: 'core', origin: 'comunidad', covers: ['embedding'],
    tagline: 'La navaja suiza local', pros: ['Modelos locales'], cons: ['Calidad variable'] },

  // —— almacenamiento (con megapiezas)
  { id: 'almacenamiento.chroma',   fase: 'almacenamiento', nombre: 'Chroma', icon: 'database', level: 'core', origin: 'comunidad', covers: ['almacenamiento'],
    tagline: 'Vector store ligero para empezar', pros: ['Cero fricción'], cons: ['Escala limitada'] },
  { id: 'almacenamiento.pgvector', fase: 'almacenamiento', nombre: 'PostgreSQL + pgvector', icon: 'database', level: 'core', origin: 'comunidad', covers: ['almacenamiento'],
    tagline: 'Vectores + SQL: el prefiltro determinista más potente', pros: ['Filtros SQL', 'Transaccional'], cons: ['No es BD vectorial nativa'] },
  { id: 'almacenamiento.qdrant',   fase: 'almacenamiento', nombre: 'Qdrant', icon: 'database', level: 'core', origin: 'comunidad', covers: ['almacenamiento'],
    tagline: 'Rust, filtros de payload rápidos', pros: ['Rápido con filtros'], cons: ['Ecosistema menor'] },
  { id: 'almacenamiento.weaviate', fase: 'almacenamiento', nombre: 'Weaviate', icon: 'database', level: 'core', origin: 'comunidad', covers: ['almacenamiento'], integrates: ['embedding'],
    tagline: 'BD vectorial con módulos vectorizer (embedding integrado)', pros: ['Integra embedding'], cons: ['Operación propia'] },
  { id: 'almacenamiento.pinecone', fase: 'almacenamiento', nombre: 'Pinecone', icon: 'database', level: 'core', origin: 'comercial', covers: ['almacenamiento'], integrates: ['embedding'],
    tagline: 'Vector DB gestionada con inferencia integrada', pros: ['Sin ops'], cons: ['Coste, lock-in'] },
  { id: 'almacenamiento.elasticsearch', fase: 'almacenamiento', nombre: 'Elasticsearch', icon: 'database', level: 'avanzada', origin: 'comunidad',
    covers: ['almacenamiento', 'recuperacion'], mega: true,
    tagline: 'BM25 + kNN: búsqueda y almacenamiento en uno', pros: ['Híbrido nativo'], cons: ['Operación pesada'] },
  { id: 'almacenamiento.azure-ai-search', fase: 'almacenamiento', nombre: 'Azure AI Search', icon: 'database', level: 'avanzada', origin: 'comercial', vendor: 'Microsoft',
    covers: ['chunking', 'embedding', 'almacenamiento', 'recuperacion'], mega: true,
    tagline: 'Indexa, trocea, embebe y busca en un solo servicio',
    pros: ['Pipeline completo gestionado', 'Seguridad empresarial'], cons: ['Lock-in', 'Coste por operación', 'Control fino del chunking'] },

  // —— ruido
  { id: 'ruido.colisiones', fase: 'ruido', nombre: 'Test de colisiones', icon: 'activity', level: 'core', origin: 'comunidad', covers: ['ruido'],
    tagline: '¿Mi chunk responde a preguntas de otro dominio? Mide el tropiezo',
    pros: ['Detecta ruido entre dominios'], cons: ['Requiere queries de prueba'] },
  { id: 'ruido.umbral', fase: 'ruido', nombre: 'Umbral de interferencia', icon: 'sliders-horizontal', level: 'avanzada', origin: 'comunidad', covers: ['ruido'],
    tagline: 'Alerta cuando un chunk asoma en búsquedas de dominios ajenos por encima del umbral',
    pros: ['Vigilancia continua'], cons: ['Calibración del umbral'] },

  // —— framework (con megapiezas y cuñas propias)
  { id: 'framework.custom',    fase: 'framework', nombre: 'Custom (a medida)', icon: 'wrench', level: 'core', origin: 'comunidad', covers: ['framework'],
    tagline: 'Tu propio pipeline: control total', pros: ['Control absoluto'], cons: ['Todo el mantenimiento'] },
  { id: 'framework.langchain', fase: 'framework', nombre: 'LangChain / LangGraph', icon: 'puzzle', level: 'core', origin: 'comunidad',
    covers: ['framework', 'recuperacion', 'generacion'], mega: true,
    tagline: 'Orquestación de recuperación y generación', pros: ['Ecosistema enorme'], cons: ['Abstracciones cambiantes'] },
  { id: 'framework.llamaindex', fase: 'framework', nombre: 'LlamaIndex', icon: 'wrench', level: 'core', origin: 'comunidad',
    covers: ['framework', 'ingesta', 'chunking', 'recuperacion', 'generacion'], mega: true,
    tagline: 'De los datos a la respuesta: readers, node parsers, retrievers', pros: ['Ideal para datos'], cons: ['Actualizaciones frecuentes'] },
  { id: 'framework.haystack',  fase: 'framework', nombre: 'Haystack', icon: 'wrench', level: 'core', origin: 'comunidad',
    covers: ['framework', 'ingesta', 'chunking', 'recuperacion', 'generacion'], mega: true,
    tagline: 'Pipelines declarativos de deepset', pros: ['Muy estructurado'], cons: ['Menos comunidad ES'] },
  { id: 'framework.ragkit',    fase: 'framework', nombre: 'ragkit ★', icon: 'chef-hat', level: 'core', origin: 'propio',
    covers: ['framework', 'ingesta', 'limpieza', 'estructura', 'transversales'], mega: true,
    tagline: 'Nuestro kit de cocina del corpus: de la fuente al rack validado',
    pros: ['Curado según el método del libro', 'Idempotente por diseño'], cons: ['Cuña 😄'] },
  { id: 'framework.nucleus',   fase: 'framework', nombre: 'nucleus ★', icon: 'orbit', level: 'core', origin: 'propio',
    covers: ['framework', 'almacenamiento', 'recuperacion', 'reranking'], mega: true,
    tagline: 'El núcleo de servicio del RAG: despensa, búsqueda y emplatado',
    pros: ['Prefiltro determinista integrado'], cons: ['Cuña 😄'] },

  // —— recuperacion
  { id: 'recuperacion.densa',           fase: 'recuperacion', nombre: 'Búsqueda densa', icon: 'search', level: 'core', origin: 'comunidad', covers: ['recuperacion'],
    tagline: 'Similitud semántica de embeddings', pros: ['Entiende sinonimia'], cons: ['Sufre sin prefiltro'] },
  { id: 'recuperacion.sparse-bm25',     fase: 'recuperacion', nombre: 'BM25 (sparse)',  icon: 'search', level: 'core', origin: 'comunidad', covers: ['recuperacion'],
    tagline: 'Clásico léxico: palabras exactas', pros: ['Preciso con términos raros'], cons: ['Ciego a sinónimos'] },
  { id: 'recuperacion.hibrida',         fase: 'recuperacion', nombre: 'Híbrida densa + sparse', icon: 'shuffle', level: 'avanzada', origin: 'comunidad', covers: ['recuperacion'],
    tagline: 'Lo mejor de los dos mundos con fusión (RRF)', pros: ['Robusta'], cons: ['Dos índices'] },
  { id: 'recuperacion.prefiltro-metadata', fase: 'recuperacion', nombre: 'Prefiltro por metadatos', icon: 'filter', level: 'core', origin: 'comunidad', covers: ['recuperacion'],
    tagline: 'La semántica encuentra lo parecido; el filtro decide qué puede competir',
    pros: ['Precisión up', 'Universo reducido'], cons: ['Metadatos obligatorios'] },
  { id: 'recuperacion.rbac-abac',       fase: 'recuperacion', nombre: 'RBAC / ABAC', icon: 'shield', level: 'avanzada', origin: 'comunidad', covers: ['recuperacion'],
    tagline: 'Identidad → reglas → filtro. Nunca el LLM como autoridad de seguridad',
    pros: ['Seguridad determinista'], cons: ['Modelo de permisos previo'] },

  // —— reranking
  { id: 'reranking.cross-encoder',    fase: 'reranking', nombre: 'Cross-encoder', icon: 'arrow-up-wide-narrow', level: 'core', origin: 'comunidad', covers: ['reranking'],
    tagline: 'Reordena los top-k con un modelo cruzado', pros: ['Gran ganancia'], cons: ['Latencia'] },
  { id: 'reranking.boost-transversales', fase: 'reranking', nombre: 'Boost de transversales', icon: 'trending-up', level: 'avanzada', origin: 'comunidad', covers: ['reranking'],
    tagline: 'Los documentos hilados entre dominios pesan más', pros: ['Conceptos transversales'], cons: ['Requiere fase transversales'] },

  // —— generacion
  { id: 'generacion.llm-generador',    fase: 'generacion', nombre: 'LLM generador', icon: 'bot', level: 'core', origin: 'comercial', covers: ['generacion'],
    tagline: 'El modelo que redacta la respuesta', pros: ['—'], cons: ['—'] },
  { id: 'generacion.plantilla-citas',  fase: 'generacion', nombre: 'Plantilla con citas', icon: 'quote', level: 'core', origin: 'comunidad', covers: ['generacion'],
    tagline: 'Responde citando el chunk y la fuente', pros: ['Trazabilidad'], cons: ['—'] },

  // —— evaluacion
  { id: 'evaluacion.dataset-aureo', fase: 'evaluacion', nombre: 'Dataset áureo', icon: 'target', level: 'core', origin: 'comunidad', covers: ['evaluacion'],
    tagline: 'Preguntas y respuestas patrón: Recall ≥ 90% o cero, no-deployment', pros: ['Validación medible'], cons: ['Esfuerzo inicial'] },
  { id: 'evaluacion.metricas',      fase: 'evaluacion', nombre: 'Métricas continuas', icon: 'gauge', level: 'core', origin: 'comunidad', covers: ['evaluacion'],
    tagline: 'Recall, precisión y deriva en cada despliegue', pros: ['Anticipa regresiones'], cons: ['Infraestructura'] },

  // —— gobierno
  { id: 'gobierno.frescura', fase: 'gobierno', nombre: 'Frescura del corpus', icon: 'refresh-cw', level: 'core', origin: 'comunidad', covers: ['gobierno'],
    tagline: 'Reingesta idempotente programada', pros: ['Sin corpus caducado'], cons: ['Pipelines estables'] },
  { id: 'gobierno.coste',    fase: 'gobierno', nombre: 'Control de coste', icon: 'coins', level: 'core', origin: 'comunidad', covers: ['gobierno'],
    tagline: 'Presupuesto por ingesta y por consulta', pros: ['Sin sorpresas'], cons: ['—'] },
];

const PLANTILLAS = [
  { id: 'rag-minimo', nombre: 'RAG mínimo (one-shot)', badge: 'arranque',
    desc: 'La receta de inicio: pocas piezas, todo obligatorio cubierto. Ideal para una primera prueba.',
    blocks: ['corpus.carpeta-pdf', 'ingesta.lectores-pdf', 'chunking.fijo', 'embedding.bge-m3', 'almacenamiento.chroma', 'framework.langchain', 'recuperacion.densa', 'generacion.plantilla-citas'] },
  { id: 'empresarial-segura', nombre: 'Empresarial con seguridad', badge: 'plantilla',
    desc: 'Con modelo de conocimiento, metadatos de seguridad, prefiltro determinista, ruido y evaluación.',
    blocks: ['modelo.dominios', 'modelo.etiquetas', 'corpus.wiki', 'ingesta.lectores-pdf', 'limpieza.deduplicacion', 'chunking.semantico', 'metaetiquetado.seguridad', 'metaetiquetado.vigencia', 'embedding.openai', 'almacenamiento.pgvector', 'ruido.colisiones', 'framework.custom', 'recuperacion.prefiltro-metadata', 'recuperacion.rbac-abac', 'reranking.cross-encoder', 'generacion.plantilla-citas', 'evaluacion.dataset-aureo'] },
  { id: 'megapiezas', nombre: 'Megapiezas: ragkit ★ + Azure', badge: 'plantilla',
    desc: 'Dos megapiezas cubren casi todo el pipeline: ragkit cocina el corpus y Azure sirve la búsqueda.',
    blocks: ['modelo.etiquetas', 'corpus.paginas-web', 'framework.ragkit', 'almacenamiento.azure-ai-search', 'framework.custom', 'generacion.llm-generador', 'reranking.boost-transversales', 'evaluacion.metricas'] },
];

/* Glosario: cada término técnico del sitio enlaza aquí (componente <Term>). */
const TERMINOS = {
  'rag': 'RAG (Retrieval-Augmented Generation): un LLM que responde apoyándose en tus documentos, recuperados en el momento de preguntar.',
  'corpus': 'Conjunto de documentos que alimentan el RAG: la materia prima.',
  'chunk': 'Porción de documento troceada: la unidad mínima que se recupera.',
  'píldora de información': 'Un chunk que se basta a sí mismo para responder algo, sin necesitar al resto de la página.',
  'chunking': 'Trocear los documentos en chunks. El tamaño no se elige: se hereda del dominio.',
  'overlap': 'Solape entre chunks consecutivos para no perder ideas en el corte.',
  'embedding': 'Representar texto como vector de números para comparar significados por distancia.',
  'bm25': 'Algoritmo de búsqueda léxica clásica: encuentra palabras exactas (sparse).',
  'densa': 'Búsqueda por similitud de embeddings: encuentra significados parecidos.',
  'reranking': 'Reordenar los resultados recuperados con un modelo más fino antes de generar.',
  'tenant': 'Cliente o entidad aislada dentro de un sistema multiempresa.',
  'rbac': 'Role-Based Access Control: permisos según el rol del usuario.',
  'abac': 'Attribute-Based Access Control: permisos según atributos (país, clasificación, vigencia…).',
  'dataset áureo': 'Conjunto patrón de preguntas y respuestas correctas para medir el RAG. Recall ≥ 90% o cero: no-deployment.',
  'recall': 'Fracción de respuestas correctas que el sistema consigue encontrar.',
  'mcp': 'Model Context Protocol: estándar para exponer herramientas y datos a modelos.',
  'one-shot': 'Prueba puntual: montas, preguntas una vez y aprendes.',
  'prefiltro determinista': 'Regla fija (metadatos) que reduce qué información puede competir en la búsqueda, antes de que actúe la semántica.',
  'megapieza': 'Pieza que cubre varias fases del pipeline por sí sola (un framework o una BD que lo hace todo).',
  'transversal': 'Documento que hilan chunks de varios dominios para responder conceptos multi-dominio.',
  'idempotente': 'Ejecutar dos veces no rompe nada: la reingesta deja el mismo resultado.',
  'medallón': 'Arquitectura Bronce (crudo) → Silver (curado) → Gold (síntesis validada).',
};

/* utilidades compartidas */
const faseById = (id) => FASES.find(f => f.id === id);
const piezaById = (id) => PIEZAS.find(p => p.id === id);
const estacionById = (id) => ESTACIONES.find(e => e.id === id);
const NIVEL_LABEL = { obligatoria: 'Obligat.', recomendada: 'Recom.', opcional: 'Opcional' };
const NIVEL_CLS = { obligatoria: 'ob', recomendada: 'rec', opcional: 'opc' };
