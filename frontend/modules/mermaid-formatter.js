export function formatMermaid(code) {
  if (typeof code !== "string") return "";
  const lines = code.split("\n");
  let indentLevel = 0;
  const formattedLines = [];

  const diagramHeaders = [
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|requirementDiagram|C4Context|C4Container|C4Component|kanban|architecture)/i,
  ];

  let hasSeenHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "") {
      if (
        formattedLines.length > 0 &&
        formattedLines[formattedLines.length - 1] !== ""
      ) {
        formattedLines.push("");
      }
      continue;
    }

    const isHeader = diagramHeaders.some((regex) => regex.test(line));
    const isClosingBlock =
      /^(end|else|opt|loop|alt|par|critical)/i.test(line) &&
      !/^end[a-zA-Z0-9]/i.test(line);

    if (isClosingBlock && indentLevel > 0) {
      indentLevel--;
    }

    const currentIndent = isHeader
      ? 0
      : (indentLevel + (hasSeenHeader ? 1 : 0)) * 2;
    const indentSpace = " ".repeat(currentIndent);

    const formattedLine = line.replace(
      /\s*(-->>|-\.->|->>|-->|---|==>|===|--x|--\)|-\.-|->|-x|-\)|==)\s*/g,
      " $1 ",
    );

    formattedLines.push(indentSpace + formattedLine);

    if (isHeader) {
      hasSeenHeader = true;
    }

    const isOpeningBlock =
      /^(subgraph|alt|opt|loop|par|critical|rect)/i.test(line) &&
      !/(\s+end\s*|;)$/i.test(line);
    if (isOpeningBlock) {
      indentLevel++;
    }
  }

  if (
    formattedLines.length > 0 &&
    formattedLines[formattedLines.length - 1] === ""
  ) {
    formattedLines.pop();
  }

  return formattedLines.join("\n");
}
