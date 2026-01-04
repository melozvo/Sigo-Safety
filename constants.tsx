
import { RiskDefinition, Question, WorkFront, User } from './types';

export const RISK_CATALOG: RiskDefinition[] = [
  {
    id: 'electrico',
    name: 'Riesgo Eléctrico',
    category: 'ENERGÍAS PELIGROSAS',
    icon: 'bolt',
    options: {
      ALTO: 'Tableros vivos, líneas de alta tensión o instalaciones sin desenergizar.',
      MEDIO: 'Uso de extensiones, herramientas eléctricas y tableros temporales.',
      BAJO: 'Iluminación básica y equipos de carga menor.',
      NO_APLICA: 'No hay electricidad en este frente.'
    },
    eppMap: {
      MEDIO: ['Guantes de trabajo', 'Calzado dieléctrico'],
      ALTO: ['Guantes dieléctricos Clase 0', 'Careta facial arc-flash', 'Ropa ignífuga']
    }
  },
  {
    id: 'altura',
    name: 'Trabajo en Altura',
    category: 'RIESGOS FÍSICOS',
    icon: 'height',
    options: {
      ALTO: 'Trabajos >1.80m en bordes desprotegidos o andamios volados.',
      MEDIO: 'Escaleras de tijera o plataformas estables con barandales.',
      BAJO: 'Trabajos <1.50m con superficies estables.',
      NO_APLICA: 'Trabajo a nivel de suelo.'
    },
    eppMap: {
      MEDIO: ['Casco con barbiquejo'],
      ALTO: ['Arnés de cuerpo completo', 'Línea de vida doble', 'Puntos de anclaje']
    }
  },
  {
    id: 'incendio',
    name: 'Incendio / Explosión',
    category: 'RIESGOS FÍSICOS',
    icon: 'local_fire_department',
    options: {
      ALTO: 'Almacenamiento de combustibles, gases inflamables o explosivos.',
      MEDIO: 'Presencia de materiales combustibles (madera, papel) en el área.',
      BAJO: 'Área libre de materiales inflamables.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Extintor PQS cercano'],
      ALTO: ['Extintor CO2/PQS', 'Ropa de algodón', 'Manta ignífuga']
    }
  },
  {
    id: 'caliente',
    name: 'Trabajos en Caliente',
    category: 'RIESGOS FÍSICOS',
    icon: 'flare',
    options: {
      ALTO: 'Soldadura, oxicorte o esmerilado en áreas críticas.',
      MEDIO: 'Trabajos térmicos en taller controlado.',
      BAJO: 'Uso mínimo de herramientas térmicas.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Gafas de seguridad', 'Guantes de cuero'],
      ALTO: ['Careta de soldador', 'Gabacha de cuero', 'Polainas', 'Guantes kévlar']
    }
  },
  {
    id: 'excavacion',
    name: 'Excavaciones y Zanjas',
    category: 'RIESGOS MECÁNICOS',
    icon: 'landslide',
    options: {
      ALTO: 'Zanjas profundas (>1.5m) o suelos inestables.',
      MEDIO: 'Zanjas poco profundas con suelo estable.',
      BAJO: 'Nivelación manual de terreno.',
      NO_APLICA: 'No hay movimiento de tierras.'
    },
    eppMap: {
      MEDIO: ['Botas con puntera', 'Casco'],
      ALTO: ['Casco reforzado', 'Chaleco alta visibilidad', 'Entibado/Taludes']
    }
  },
  {
    id: 'ruido',
    name: 'Ruido y Vibraciones',
    category: 'RIESGOS FÍSICOS',
    icon: 'volume_up',
    options: {
      ALTO: 'Uso de demoledores, compresores o maquinaria pesada.',
      MEDIO: 'Herramientas eléctricas manuales intermitentes.',
      BAJO: 'Ambiente de obra normal.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Tapones auditivos'],
      ALTO: ['Orejeras de alta atenuación']
    }
  },
  {
    id: 'mecanico',
    name: 'Atrapamientos / Golpes',
    category: 'RIESGOS MECÁNICOS',
    icon: 'back_hand',
    options: {
      ALTO: 'Uso de grúas o maquinaria con partes móviles expuestas.',
      MEDIO: 'Manejo de materiales pesados.',
      BAJO: 'Tareas manuales ligeras.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Guantes de cuero'],
      ALTO: ['Guantes de impacto', 'Protección metatarsal']
    }
  },
  {
    id: 'proyeccion',
    name: 'Proyección de Partículas',
    category: 'RIESGOS MECÁNICOS',
    icon: 'visibility',
    options: {
      ALTO: 'Esmerilado, corte de concreto o metal.',
      MEDIO: 'Perforación menor o soplado.',
      BAJO: 'Pintura o limpieza manual.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Lentes de seguridad'],
      ALTO: ['Careta facial transparente', 'Monogafas']
    }
  },
  {
    id: 'quimico',
    name: 'Sustancias Químicas',
    category: 'RIESGOS QUÍMICOS',
    icon: 'science',
    options: {
      ALTO: 'Manejo de ácidos, solventes fuertes o combustibles.',
      MEDIO: 'Pinturas base agua o desmoldantes.',
      BAJO: 'Detergentes básicos.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Guantes de nitrilo'],
      ALTO: ['Guantes químicos largos', 'Gafas cerradas']
    }
  },
  {
    id: 'polvos',
    name: 'Polvos y Humos',
    category: 'RIESGOS QUÍMICOS',
    icon: 'masks',
    options: {
      ALTO: 'Corte de tabla-yeso, concreto o soldadura cerrada.',
      MEDIO: 'Limpieza de áreas polvorientas.',
      BAJO: 'Poco polvo y buena ventilación.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Mascarilla N95'],
      ALTO: ['Respirador de media cara con filtros']
    }
  },
  {
    id: 'ergonomico',
    name: 'Riesgo Ergonómico',
    category: 'RIESGOS HUMANOS',
    icon: 'accessibility_new',
    options: {
      ALTO: 'Carga manual constante (>25kg) o posturas forzadas.',
      MEDIO: 'Levantamiento ocasional de cargas moderadas.',
      BAJO: 'Trabajo con cargas ligeras o sentado.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Cinto lumbar (opcional)'],
      ALTO: ['Faja de soporte sacro-lumbar', 'Ayuda mecánica']
    }
  },
  {
    id: 'biologico',
    name: 'Riesgo Biológico / Salud',
    category: 'RIESGOS HUMANOS',
    icon: 'medical_services',
    options: {
      ALTO: 'Frente sin acceso a agua potable o baños adecuados.',
      MEDIO: 'Presencia de vectores o limpieza deficiente.',
      BAJO: 'Áreas higiénicas con agua y baños.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Gel antibacterial'],
      ALTO: ['Agua potable disponible', 'Servicios sanitarios']
    }
  },
  {
    id: 'transito',
    name: 'Tránsito de Maquinaria',
    category: 'RIESGOS DE TRÁNSITO',
    icon: 'local_shipping',
    options: {
      ALTO: 'Interacción constante con camiones o excavadoras.',
      MEDIO: 'Carga y descarga ocasional.',
      BAJO: 'Tránsito peatonal controlado.',
      NO_APLICA: 'No aplica.'
    },
    eppMap: {
      MEDIO: ['Chaleco reflectivo'],
      ALTO: ['Chaleco Clase 2 alta visibilidad']
    }
  }
];

export const INITIAL_USER: User = {
  name: '',
  company: '',
  role: 'Supervisor de Seguridad',
  phone: '+502 ',
  email: '',
  photo: undefined
};

export const MOCK_FRONTS: WorkFront[] = [];

export const ROUTINE_QUESTIONS: Question[] = [
  {
    id: 'epp_check',
    text: '¿El personal cuenta con el EPP específico y en buen estado?',
    subtext: 'Verificación obligatoria de casco, botas y equipo del frente.',
    category: 'Equipo de Protección',
    icon: 'shield_person',
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'gen_1',
    text: '¿El área está limpia y libre de obstáculos?',
    subtext: 'Mantener pasillos y rutas de evacuación despejadas.',
    category: 'Orden y Limpieza',
    icon: 'cleaning_services',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'fire_1',
    text: '¿Hay extintores vigentes y despejados en el frente?',
    subtext: 'Cumplimiento NRD2/NFPA 10.',
    riskId: 'incendio',
    category: 'Prevención Incendio',
    icon: 'fire_extinguisher',
    image: 'https://images.unsplash.com/photo-1629923616688-69cb76104445?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'erg_1',
    text: '¿El personal realiza levantamiento de carga con postura correcta?',
    subtext: 'Espalda recta y flexión de rodillas.',
    riskId: 'ergonomico',
    category: 'Ergonomía',
    icon: 'accessibility_new',
    image: 'https://images.unsplash.com/photo-1581093583449-ed2521344db5?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'bio_1',
    text: '¿Tienen acceso cercano a agua potable y servicios sanitarios?',
    subtext: 'Requisito de higiene según Acuerdo 229-2014.',
    riskId: 'biologico',
    category: 'Higiene y Salud',
    icon: 'water_drop',
    image: 'https://images.unsplash.com/photo-1517173663673-c6252989c8a9?q=80&w=2070&auto=format&fit=crop'
  }
];
