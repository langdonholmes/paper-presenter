import { MilkdownProvider, Milkdown, useEditor } from "@milkdown/react";
import { Editor, defaultValueCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import type { Ctx } from "@milkdown/kit/ctx";
import "../styles/milkdown.css";

interface Props {
  defaultValue: string;
  onChange: (markdown: string) => void;
}

function MilkdownInner({ defaultValue, onChange }: Props) {
  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
        ctx.get(listenerCtx).markdownUpdated((_ctx: Ctx, markdown: string) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(listener);
  }, []);

  return (
    <div className="milkdown-wrap">
      <Milkdown />
    </div>
  );
}

export default function MilkdownEditor(props: Props) {
  return (
    <MilkdownProvider>
      <MilkdownInner {...props} />
    </MilkdownProvider>
  );
}
