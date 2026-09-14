# @evrika/manual-kit

## Что это

Оболочка, общая для руководства кассира (`evrika-cashier-desktop/manual`) и
руководства курьера (`Evrika_Delivery_App/manual`), — вынесенная в отдельный
переиспользуемый пакет. Оба SPA были почти дословными копиями друг друга:
одна и та же трёхколоночная раскладка, поиск, переключение языка, сборка в
один файл. Пакет забирает себе всё, что не знает о предметной области —
оболочку, словарь блоков, поиск, роутинг, — а контент, бренд, набор локалей и
собственные типы блоков остаются за конкретным руководством.

## Быстрый старт

```bash
npx @evrika/manual-kit new-manual my-manual
cd my-manual
npm install
npm run dev
```

`new-manual` создаёт минимальную структуру: `index.html`, `vite.config.ts`,
`src/main.tsx` (меньше тридцати строк), `src/theme.css` и одну главу на две
локали (`ru`, `kk`) в `content/`. Дальше — писать контент и, при
необходимости, донастраивать конфиг ниже.

## Конфигурация

Всё поведение оболочки задаётся одним объектом `ManualConfig`, который
передаётся в `renderManual` (или в `resolveConfig` + `<Manual config={...}>`
для встраивания в существующее React-приложение).

| Поле | Тип | По умолчанию | Когда задавать |
|---|---|---|---|
| `root` | `HTMLElement` | — (обязательное) | Всегда — элемент, в который монтируется оболочка |
| `brand` | `string \| ReactNode` | — (обязательное) | Название продукта или произвольная разметка логотипа в шапке сайдбара |
| `manifest` | `Manifest<L>` | — (обязательное) | Всегда — `content/manifest.json` (версия, список локалей, порядок глав) |
| `chapters` | `Record<string, { default: Chapter<B> }>` | — (обязательное) | Всегда — результат `import.meta.glob('../content/*/*.json', { eager: true })` |
| `media` | `Record<string, string>` | `undefined` | Когда в контенте есть картинки/видео — результат `import.meta.glob('../content/media/*', { eager: true, query: '?url', import: 'default' })` |
| `locales.list` | `readonly L[]` | `manifest.locales` | Когда список локалей для рантайма отличается от того, что в манифесте (редко) |
| `locales.fallback` | `L` | первая локаль из списка | Когда базовой должна быть не первая по порядку локаль |
| `locales.labels` | `Record<L, string>` | встроенные подписи для `ru`/`kk` | Обязательно для любой локали, для которой библиотека не знает подписи (например, своей третьей локали) |
| `locales.strings` | `{ [K in L]?: Partial<UiStrings> }` | `{}` | Обязательно (полностью) для локали без встроенных строк; частично — чтобы точечно переопределить одну-две строки во встроенной локали |
| `blocks` | `BlockRegistry<B>` | `defaultRegistry` (девять встроенных типов) | Когда есть собственные типы блоков или нужно исключить встроенный |
| `colorScheme` | `'light' \| 'dark' \| 'system'` | `'light'` | Тёмная тема — по запросу; `'system'` — чтобы следовать настройке ОС читателя |
| `search.enabled` | `boolean` | `true` | `false` — чтобы полностью убрать поиск |
| `search.minQueryLength` | `number` | `2` | Изменить минимальную длину запроса |
| `search.maxResults` | `number` | `30` | Изменить число результатов поиска |
| `routing` | `'hash' \| 'memory'` | `'hash'` | `'memory'` — для встраивания в тестовое окружение или в другой роутер, где хеш уже занят |
| `storageKey` | `string` | slug от `brand`, когда `brand` — строка (иначе `'default'`) | **Обязательно**, если `brand` — `ReactNode`: JSX-логотип нельзя превратить в slug, и без явного ключа два таких руководства в одном браузере делят одну запись запомненного языка и спорят за неё |
| `document.title` | `(ctx: RouteContext<L>) => string` | заголовок главы, затем `brand`, через ` — ` | Когда нужен другой формат заголовка вкладки |
| `slots.renderBrand` | `(ctx) => ReactNode` | не задано | Заменить содержимое области бренда в сайдбаре |
| `slots.renderSidebarFooter` | `(ctx) => ReactNode` | не задано | Добавить что-то под списком глав (например, ссылку на поддержку) |
| `slots.renderChapterFooter` | `(ctx) => ReactNode` | не задано | Добавить что-то под текстом главы (например, «Полезно?») |
| `slots.renderSearchEmpty` | `(ctx & { query }) => ReactNode` | не задано | Заменить сообщение о пустом результате поиска |

## Контент

Глава — плоский JSON-файл, а не дерево: блок можно переставить, перевести и
найти поиском, не разбирая структуру.

```json
{
  "id": "getting-started",
  "title": "Начало работы",
  "blocks": [
    { "type": "heading", "level": 2, "id": "welcome", "text": "Добро пожаловать" },
    { "type": "paragraph", "text": "Первый абзац." }
  ]
}
```

`content/manifest.json` задаёт версию, список локалей и порядок глав:

```json
{
  "version": 1,
  "locales": ["ru", "kk"],
  "chapters": [
    { "id": "getting-started", "file": "01-getting-started.json" }
  ]
}
```

Файл главы лежит по пути `content/<locale>/<file>`, то есть `file` в манифесте
— это только имя файла, без сегмента локали и без вложенных папок.

Внутри поля `text` разрешены ровно две вещи: `**жирный**` и ссылка на якорь —
`[текст](#id-заголовка)` в своей главе или `[текст](#глава/id-заголовка)` для
ссылки на другую главу. **Ни HTML, ни Markdown** в `text` не поддерживаются —
если нужно что-то богаче, это новый тип блока, а не расширение `text`.

### Типы блоков

| Тип | Обязательные поля | Для чего |
|---|---|---|
| `heading` | `level` (`2` или `3`), `id`, `text` | Заголовок раздела. `id` обязателен — это якорь |
| `paragraph` | `text` | Обычный абзац |
| `list` | `items` (`ordered?: boolean` — нумерованный список) | Список |
| `steps` | `items` | Пошаговая инструкция, карточками с номерами |
| `image` | `src`, `alt` (`caption?`) | Картинка |
| `video` | `src` (`poster?`, `caption?`) | Видео |
| `callout` | `variant` (`info` \| `warning` \| `danger` \| `success`), `text` | Врезка |
| `table` | `headers`, `rows` | Таблица |
| `keys` | `combo` (массив клавиш), `text` | Комбинация клавиш; курьерское руководство его не использует, но неиспользуемый тип ничего не стоит |

## Свои блоки

Новый тип блока — это `defineBlock` плюс собственный реестр:

```tsx
import { defineBlock, createRegistry, builtinBlocks } from '@evrika/manual-kit';
import type { BlockBase, BlockProps } from '@evrika/manual-kit';

interface ShortcutBlock extends BlockBase {
  type: 'shortcut';
  label: string;
  text: string;
}

function Shortcut({ block }: BlockProps<ShortcutBlock>) {
  return (
    <p id={block.id} className="shortcut">
      <span className="shortcut-label">{block.label}</span>
      <span className="shortcut-text">{block.text}</span>
    </p>
  );
}

const shortcutBlock = defineBlock<ShortcutBlock>({
  type: 'shortcut',
  component: Shortcut,
  searchText: (block) => `${block.label} ${block.text}`,
  schema: {
    required: ['type', 'label', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'shortcut' },
      id: { $ref: '#/definitions/anchor' },
      label: { $ref: '#/definitions/nonEmptyText' },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});

const registry = createRegistry([...builtinBlocks, shortcutBlock]);
```

`registry` передаётся в `ManualConfig.blocks`. Чтобы **заменить** встроенный
тип, а не добавить свой рядом с ним, отфильтруйте его из `builtinBlocks` перед
тем как передать массив в `createRegistry` — сам `createRegistry` намеренно
отказывает, если два спека претендуют на один и тот же `type`, а не
перезаписывает молча.

## Локали

Третья (и любая не встроенная в библиотеку) локаль требует двух вещей:

1. Подписи — `locales.labels.<locale>`, название языка на нём самом.
2. Всех двенадцати строк интерфейса целиком в `locales.strings.<locale>`:
   `languageGroup`, `searchPlaceholder`, `searchEmpty`, `searchHint`,
   `fallbackNotice`, `chapterMissing`, `onThisPage`, `nextChapter`,
   `previousChapter`, `openSections`, `closeSections`, `mediaMissing`.

Для встроенных локалей (`ru`, `kk`) `locales.strings.<locale>` можно задать
частично — значения сливаются со встроенным набором по ключам
(`{ ...bundled, ...override }`), так что переопределить нужно только то, что
отличается. Для локали без встроенного набора любой пропущенный ключ — это
ошибка при старте (`resolveConfig` бросает исключение), а не молчаливо
пустая строка в интерфейсе.

## Темизация

Полный список токенов, их значения по умолчанию и что каждый задаёт — в
[`docs/tokens.md`](docs/tokens.md).

Все токены оболочки объявлены в `@layer tokens` и названы `--manual-*`. Слои
существуют для того, чтобы их можно было безопасно перебить: неслоёная
таблица стилей (`theme.css` без `@layer`) всегда старше любого слоя вне
зависимости от порядка подключения файлов и специфичности селекторов — поэтому
собственный `theme.css` побеждает встроенные токены без `!important` и без
необходимости знать, в каком порядке и с каким именем объявлены слои
оболочки.

```css
/* theme.css — без @layer */
:root {
  --manual-brand: oklch(55% 0.15 260);
}
```

`colorScheme` управляет тёмной темой: `'light'` (по умолчанию) фиксирует
светлую палитру независимо от настроек читателя, `'dark'` — тёмную, а
`'system'` — единственный режим, при котором оболочка следует
`prefers-color-scheme` устройства читателя. Тёмная тема — не поведение по
умолчанию: руководство, само переключившееся в тёмный режим без спроса,
удивляет читателя, поэтому включать её нужно явно.

Оболочка рендерит `<div className="manual">`, оборачивающий
`<div className="manual-layout">`: `.manual` — это контейнер, на ширину
которого реагируют `@container`-запросы верстки; `.manual-layout` — это то,
что реально перестраивается в одну колонку на узкой ширине. Собственный CSS,
нацеленный на раскладку, должен различать эти два уровня — обычно менять нужно
именно `.manual-layout` и его потомков, а не сам `.manual`.

## Сборка и выкладка

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { manualViteConfig } from '@evrika/manual-kit/vite';

export default defineConfig(manualViteConfig());
```

Сборка по умолчанию — один самодостаточный `dist/index.html` (JS, CSS и весь
контент внутри, картинки — data URI). Это не эстетика: страница, открытая по
`file://`, не может `fetch()` собственный JSON — origin непрозрачен и в
WebView2, и в WKWebView, — поэтому обычная многофайловая сборка показала бы
пустое руководство везде, где его открывают с диска или из вебвью. Если
сборка станет неподъёмной из-за тяжёлых скриншотов, передайте
`manualViteConfig({ singleFile: false })` и выкладывайте `dist/` папкой —
тогда офлайн-копия перестаёт быть одним файлом.

Конфигурация хостинга Firebase (`firebase.json`, `.firebaserc`) в пакет не
входит и остаётся у каждого приложения своей: у руководства курьера это
таргет `delivery-manual` (сайт `evrika-delivery` в том же проекте Firebase,
что и у кассира), у руководства кассира — свой таргет на своём сайте. Не
указать таргет в команде деплоя — значит рискнуть выложить оба сайта разом.

## CLI

Три команды, все — через `npx manual-kit <команда>` (или `manual-kit`, если
пакет установлен локально и вызывается из npm-скрипта):

- `manual-kit validate [contentDir]` — проверяет контент по схеме,
  собранной из реестра встроенных блоков, плюс паритет локалей, перекрёстные
  ссылки и картинки в обе стороны. По умолчанию `contentDir` — `./content`.
- `manual-kit schema [contentDir]` — генерирует `content/schema.json` из
  того же реестра.
- `manual-kit new-manual <dir>` — создаёт новое руководство с нуля (см.
  «Быстрый старт»).

CLI не умеет принимать реестр блоков из командной строки, поэтому у
руководства со своими типами блоков `manual-kit validate` проверит контент по
встроенным девяти типам и отвергнет собственный — это ожидаемо, а не баг.
Для проверки со своим реестром нужен отдельный вход `@evrika/manual-kit/validate`
(экспортирует `validateContent` и `buildSchema`) — он не входит в основной
пакет пакета намеренно, потому что тянет за собой `ajv`, которому нет места в
бандле браузера. Небольшой собственный скрипт:

```ts
// scripts/validate.ts
import { validateContent } from '@evrika/manual-kit/validate';
import { builtinBlocks, createRegistry } from '@evrika/manual-kit';
import { shortcutBlock } from '../src/blocks/shortcut';

const registry = createRegistry([...builtinBlocks, shortcutBlock]);
const { errors, warnings } = validateContent({ contentDir: 'content', registry });

if (warnings.length > 0) {
  console.warn(`Предупреждения (${warnings.length}):\n`);
  for (const warning of warnings) console.warn(`  • ${warning}`);
}

if (errors.length > 0) {
  console.error(`Контент не прошёл проверку (${errors.length}):\n`);
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}
console.log('Контент в порядке.');
```

`validateContent` возвращает `{ errors, warnings }`, а не бросает исключение
и не завершает процесс сама. Важно: **отсутствие главы в не-базовой локали —
это предупреждение, а не ошибка.** Это спроектированное состояние — ровно то,
для чего существует резервный переход на базовую локаль в `loadChapter`, —
поэтому оно не должно (и не может само по себе) провалить сборку. Только
`errors` должны определять код выхода скрипта; намеренный пробел в переводе не
должен ломать CI.

## Разработка пакета

```bash
npm test          # vitest
npm run example    # дев-сервер примера (три локали, свой блок, пробел перевода, все десять типов блоков)
npm run build      # tsc --noEmit + сборка dist по exports-карте
```

## Миграция существующих руководств

Пошаговый чек-лист переноса руководства кассира и руководства курьера на этот
пакет — в [`docs/migration.md`](docs/migration.md).
