import * as React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string; // Retained in prop interface for backwards compatibility, but not rendered per user request
  icon?: React.ElementType;
  actions?: React.ReactNode;
}

export function PageHeader({ title, icon: Icon, actions }: PageHeaderProps) {
  // Parse title into Main Group (bold italic dark slate) and Sub Title (regular soft blue-slate)
  let mainGroup = title;
  let subTitle = '';

  if (title.startsWith('Jobs ')) {
    mainGroup = 'Jobs';
    subTitle = title.replace('Jobs ', '');
  } else if (title.startsWith('Payment Options ')) {
    mainGroup = 'Payment Options';
    subTitle = title.replace('Payment Options ', '');
  } else if (title.startsWith('More Applications ')) {
    mainGroup = 'More Applications';
    subTitle = title.replace('More Applications ', '');
  } else if (title.startsWith('More ')) {
    mainGroup = 'More Applications';
    subTitle = title.replace('More ', '');
  } else if (title.startsWith('Customers ')) {
    mainGroup = 'Customers';
    subTitle = title.replace('Customers ', '');
  } else if (title.startsWith('Reporting ')) {
    mainGroup = 'Reporting';
    subTitle = title.replace('Reporting ', '');
  } else if (title.startsWith('Settings ')) {
    mainGroup = 'Settings';
    subTitle = title.replace('Settings ', '');
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-1 pb-2 border-b border-slate-200">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 rounded bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 shadow-2xs">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-sans flex items-baseline gap-2">
            <span className="font-bold text-[#2e4057] italic text-2xl">{mainGroup}</span>
            {subTitle && (
              <span className="font-normal text-[#5b708b] not-italic text-xl">{subTitle}</span>
            )}
          </h1>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
