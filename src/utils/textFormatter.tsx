import React from 'react';

interface FormatOptions {
  mentions?: boolean;
}

/**
 * Renders text parsing **bold** (double asterisks) into <strong> elements,
 * and optionally parses @mentions.
 */
export function renderFormattedText(text: string, options?: FormatOptions): React.ReactNode {
  if (!text) return text;

  // Split by double asterisks **bold text**
  const boldRegex = /(\*\*.*?\*\*)/g;
  const parts = text.split(boldRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          const boldContent = part.slice(2, -2);
          if (options?.mentions) {
            return (
              <strong key={index} className="font-extrabold text-on-surface">
                {renderMentionsOnly(boldContent)}
              </strong>
            );
          }
          return (
            <strong key={index} className="font-extrabold text-on-surface">
              {boldContent}
            </strong>
          );
        }

        if (options?.mentions) {
          return <React.Fragment key={index}>{renderMentionsOnly(part)}</React.Fragment>;
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

function renderMentionsOnly(text: string): React.ReactNode {
  if (!text) return text;
  const parts = text.split(/(?=@)/);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const spaceIndex = part.indexOf(' ');
          let name = part.substring(1);
          let rest = '';
          if (spaceIndex !== -1) {
            name = part.substring(1, spaceIndex);
            rest = part.substring(spaceIndex);
          }
          return (
            <span key={index}>
              <span className="font-extrabold text-primary bg-primary/10 px-1 rounded inline-flex items-center">
                {name}
              </span>
              {rest}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
