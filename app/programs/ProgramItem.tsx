'use client';
import Link from 'next/link';
import MyTooltip from '@/app/components/Tooltip';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import type { Program } from './types';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

type ProgramItemProps = {
  program: Program;
  linkPrefix?: string;
};

const ProgramItem = ({program, linkPrefix = '/programs'}: ProgramItemProps) => {
  const firstVersionId = program.elementIds[0];
  const href = firstVersionId
    ? `${linkPrefix}/${program.id}/${firstVersionId}`
    : `${linkPrefix}/${program.id}`;
  return (
    <div className="flex items-center gap-3 px-2 py-1 border-b border-gray-500">
      <Link href={href} className="flex-1 text-lg font-georgia text-white hover:text-gray-300">
        {program.title}
      </Link>
      {program.createdAt && (
        <MyTooltip content={<div>{formatDate(program.createdAt)}{program.createdBy && ` - ${program.createdBy}`}</div>} placement="left">
          <span className="text-gray-400 text-xs">{formatRelativeTimestamp(program.createdAt)}</span>
        </MyTooltip>
      )}
    </div>
  );
};

export default ProgramItem;
