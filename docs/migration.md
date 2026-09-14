# Миграция существующего руководства на `@evrika/manual-kit`

Чек-лист для перевода руководства кассира (`evrika-cashier-desktop/manual`) и
руководства курьера (`Evrika_Delivery_App/manual`) на пакет. Оба переносятся
одинаково, с двумя точечными отличиями (шаги 7 и 8). Порядок шагов рассчитан
на то, чтобы пройти его за один присест.

## 1. Установить пакет

```bash
npm i @evrika/manual-kit@0.1.0
```

Версия — **точная, не диапазон**: API пакета ещё 0.x, обратная совместимость
между минорными версиями не гарантирована.

## 2. Заменить `src/`

Удалите весь `src/`, кроме `main.tsx`, и замените его на новый:

```ts
// src/main.tsx
import { renderManual } from '@evrika/manual-kit';
import '@evrika/manual-kit/styles.css';
import './theme.css';
import manifest from '../content/manifest.json';

renderManual({
  root: document.getElementById('root')!,
  brand: 'Название продукта', // см. шаг 8 для руководства курьера
  manifest,
  chapters: import.meta.glob('../content/*/*.json', { eager: true }),
  media: import.meta.glob('../content/media/*', {
    eager: true, query: '?url', import: 'default',
  }),
});
```

Собственные компоненты сайдбара, поиска, роутинга и т. д. (`src/app/*`,
`src/blocks/*`, `src/search/*`) удаляются целиком — всё это теперь приходит из
пакета.

## 3. Перенести токены в `theme.css`

Возьмите блок `:root` из старого `src/styles.css` и перенесите в новый
`src/theme.css`, переименовав каждую переменную в её эквивалент `--manual-*`.
Файл должен остаться **без `@layer`** — токены пакета лежат в
`@layer tokens`, а неслоёная таблица стилей всегда старше любого слоя
независимо от порядка подключения и специфичности, поэтому такой `theme.css`
побеждает без `!important` и без знания того, как называется слой оболочки.

| Старая переменная | Новая переменная | Замечание |
|---|---|---|
| `--primary` | `--manual-brand` | |
| `--primary-dark` | `--manual-brand-strong` | |
| `--primary-tint` | `--manual-brand-tint` | В пакете это `light-dark()`-выражение — если задаёте только светлую тему, можно оставить как было |
| `--text` | `--manual-text` | |
| `--text-muted` | `--manual-text-muted` | |
| `--surface` | `--manual-surface` | |
| `--surface-alt` | `--manual-surface-alt` | |
| `--line` | `--manual-line` | |
| `--warning` | `--manual-warning` | |
| `--warning-tint` | `--manual-warning-tint` | |
| `--danger` | `--manual-danger` | |
| `--danger-tint` | `--manual-danger-tint` | |
| `--success` | `--manual-success` | |
| `--success-tint` | `--manual-success-tint` | |
| `--sidebar-width` | `--manual-sidebar-width` | Типизирован через `@property` в пакете — некорректное значение откатится к `320px`, а не сломает раскладку |
| `--content-width` | `--manual-content-width` | Типизирован через `@property`, откат — `780px` |
| `--rail-width` | `--manual-rail-width` | Типизирован через `@property`, откат — `240px` |
| `--font` | `--manual-font` | |
| `--space-1` … `--space-6` | `--manual-space-1` … `--manual-space-6` | Значения совпадают (4/8/12/18/28/40px), переименование без изменений |
| `--step-0` … `--step-3`, `--step-small`, `--step-tiny` | `--manual-step-0` … `--manual-step-3`, `--manual-step-small`, `--manual-step-tiny` | Старые значения — фиксированные px; в пакете `--step-2`/`--step-3` заданы как `clamp()` и тянутся от ширины контейнера. Перенесите старые значения, только если важно сохранить пиксель-в-пиксель прежний вид — иначе оставьте значения пакета и не переопределяйте эти два |
| — (не было) | `--manual-font-mono` | Новый токен, используется блоком `keys`; переопределять не обязательно |
| — (не было) | `--manual-radius`, `--manual-radius-lg` | Новые токены (скругления); в старом CSS радиусы были захардкожены по месту. Переопределять не обязательно |

Полный справочник по каждому токену — в [`docs/tokens.md`](tokens.md).

## 4. Заменить `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { manualViteConfig } from '@evrika/manual-kit/vite';

export default defineConfig(manualViteConfig());
```

## 5. Удалить собственный валидатор

Удалите `scripts/validate-content.ts` и переключите npm-скрипт `validate` на
CLI пакета:

```json
{
  "scripts": {
    "validate": "manual-kit validate"
  }
}
```

Если в руководстве есть собственные типы блоков (ни у кассира, ни у курьера
пока нет), `manual-kit validate` их не примет — заведите свой скрипт через
`@evrika/manual-kit/validate`, пример — в README, раздел «CLI».

## 6. Пересобрать схему

```bash
npx manual-kit schema
```

Перезапишет `content/schema.json`, сгенерировав его из реестра встроенных
блоков, а не из старого файла, поддерживаемого руками.

## 7. Руководство кассира

Дополнительных изменений конфигурации не требуется — блок `keys`, который оно
использует, встроен в пакет по умолчанию.

## 8. Руководство курьера

Задайте `brand: 'EG Delivery'` в `main.tsx`. Это не только заголовок в
сайдбаре — заодно чинит захардкоженную строку `Evrika Cashier`, которую
руководство курьера сейчас показывает по ошибке
(`src/app/Sidebar.tsx:47`) — унаследованную от прообраза при копировании и
никогда не замеченную, потому что в интерфейсе курьера её негде было увидеть
рядом с оригиналом.

## 9. Что не трогать

`content/`, `content/media/`, `index.html`, `firebase.json`, `.firebaserc`
остаются как есть — таргет хостинга и структура контента не относятся к
оболочке.

## 10. Проверка

```bash
npm run validate
npm run build
```

Затем откройте `dist/index.html` **через `file://`** (двойным кликом в
Finder, не через дев-сервер и не через `npx serve`). Это тот самый случай,
ради которого существует сборка в один файл: страница, открытая по `file://`,
не может сделать `fetch()` за собственным JSON — origin непрозрачен и в
WebView2, и в WKWebView, — так что пропустив эту проверку, легко узнать про
пустое руководство только когда его уже открыли на кассе или в курьерском
приложении. Дев-сервер эту ошибку никогда не покажет — у него origin
нормальный, — поэтому он не заменяет эту проверку, а только её маскирует.
