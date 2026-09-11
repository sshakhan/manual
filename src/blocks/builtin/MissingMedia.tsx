import { useManual } from '../../app/context';

/**
 * A named file that is not in the bundle renders as a labelled gap rather than
 * a broken image: a manual ships with placeholder media and real screenshots
 * land later by filename, so this state is expected during authoring.
 *
 * The label used to be the hardcoded Russian «Нет файла» — one line of the
 * manual that ignored the reader's locale. It is a UI string now.
 */
export function MissingMedia({ src }: { src: string }) {
  const { strings } = useManual();

  return (
    <div className="figure figure-missing">
      <span className="figure-missing-label">
        {strings.mediaMissing.replace('{src}', src)}
      </span>
    </div>
  );
}
