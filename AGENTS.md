# Reglas del Proyecto (Coding Lab)

1. **Idioma de comentarios y código explicativo:**
   - Todos los comentarios, docstrings y notas explicativas dentro del código deben redactarse siempre en **español**.

2. **Registro obligatorio en `ACTUALIZACIONES.md`:**
   - Cada vez que se realicen modificaciones, correcciones de errores o nuevas funcionalidades en el proyecto, se debe actualizar obligatoriamente el archivo `ACTUALIZACIONES.md` en la raíz del proyecto.
   - Las entradas deben contener resúmenes **cortos, claros y con un lenguaje muy humano y amigable**, fáciles de comprender para cualquier usuario o directivo sin necesidad de tecnicismos complejos.

3. **Doble confirmación obligatoria para eliminación de datos:**
   - Si una modificación o acción implica la **eliminación definitiva de información en la base de datos** (tablas, registros históricos, migraciones destructivas como reset de DB, o eliminación de datos en cascada), se debe **informar explícitamente y con total claridad al usuario de qué datos se van a borrar**.
   - No se puede proceder bajo ninguna circunstancia sin haber solicitado y obtenido una **doble confirmación expresa** del usuario.

4. **Protección de funcionalidades existentes (Cero regresiones):**
   - Al modificar o refactorizar cualquier módulo, está prohibido alterar o eliminar comportamientos previos ya establecidos (filtros de seguridad por rol, registros de auditoría, bloqueos anti doble clic, compatibilidad con modo oscuro, etc.), a menos que el usuario lo solicite expresamente.

5. **Verificación obligatoria de compilación (`build`):**
   - Antes de dar por finalizada cualquier tarea o cambio de código, se debe verificar y asegurar que el build de TypeScript y compilación pase sin errores tanto en frontend como en backend para no romper los despliegues automáticos en producción.

6. **Coherencia visual y experiencia de usuario (UX):**
   - Toda nueva interfaz, vista o modal debe soportar armónicamente tanto **Modo Claro** como **Modo Oscuro**.
   - Se deben incluir siempre estados visuales de carga (loaders/spinners) y deshabilitar botones durante las peticiones para evitar envíos duplicados.

7. **Tono profesional y sobriedad visual (Evitar emojis informales):**
   - Evitar el uso excesivo o infantil de emojis dentro de la interfaz, modales, botones, alertas o mensajes del sistema (por ejemplo: 🎉, 🚀, 🥳, 🔥, etc.) que den la impresión de un sistema poco serio o poco profesional.
   - En su lugar, priorizar siempre **iconos SVG profesionales**, tipografía limpia, estados visuales sobrios y microinteracciones elegantes propias de un software institucional y educativo formal.
