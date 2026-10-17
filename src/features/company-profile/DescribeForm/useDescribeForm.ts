import { useState } from 'react';

import { isApiError } from '../../../api/ApiError';
import { useDescribeCompany, useUploadCompanyDocuments } from '../../../api/hooks/companies';
import type { ProfileFact } from '../../../schemas/company';
import { describeLoadError } from '../../../shared/lib/loadError';
import { fileProblem, linkProblem, normalizeLink } from './materials';

export interface PickedFile {
  id: string;
  file: File;
  /** Почему файл не уйдёт на сервер; null — файл подходит. */
  problem: string | null;
}

/** Ошибка отправки человеческим языком: 400 от сервера уже сформулирована для пользователя. */
function describeSubmitError(error: unknown): string {
  if (isApiError(error) && error.kind === 'http' && error.status === 400) {
    return error.message;
  }
  return `Не удалось разобрать материалы. ${describeLoadError(error)}`;
}

let nextFileNumber = 0;

/**
 * Состояние формы «Расскажите о компании»: текст, ссылки, файлы и отправка.
 * Текст со ссылками и документы уходят разными запросами — по контракту это два эндпоинта.
 */
export function useDescribeForm(companyId: string, onDone: (facts: ProfileFact[]) => void) {
  const describe = useDescribeCompany(companyId);
  const upload = useUploadCompanyDocuments(companyId);

  const [text, setText] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validFiles = files.filter((item) => item.problem === null).map((item) => item.file);
  const isProcessing = describe.isPending || upload.isPending;

  const addLink = () => {
    if (linkDraft.trim() === '') {
      setLinkError('Введите адрес страницы');
      return;
    }
    const link = normalizeLink(linkDraft);
    const problem = linkProblem(link, links);
    setLinkError(problem);
    if (problem === null) {
      setLinks([...links, link]);
      setLinkDraft('');
      setFormError(null);
    }
  };

  const addFiles = (picked: readonly File[]) => {
    const added = picked.map((file) => ({
      id: `file-${String((nextFileNumber += 1))}`,
      file,
      problem: fileProblem(file),
    }));
    setFiles((current) => [...current, ...added]);
    setFormError(null);
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed === '' && links.length === 0 && validFiles.length === 0) {
      setFormError('Опишите компанию, добавьте ссылку или документ');
      return;
    }
    setFormError(null);
    setSubmitError(null);
    const hasDescription = trimmed !== '' || links.length > 0;
    const [described, uploaded] = await Promise.allSettled([
      hasDescription ? describe.mutateAsync({ text: trimmed, links }) : null,
      validFiles.length > 0 ? upload.mutateAsync(validFiles) : null,
    ]);

    // Принятое сервером убираем из формы, чтобы повторная отправка не задвоила факты.
    const facts: ProfileFact[] = [];
    if (described.status === 'fulfilled' && described.value) {
      facts.push(...described.value.facts);
      setText('');
      setLinks([]);
    }
    if (uploaded.status === 'fulfilled' && uploaded.value) {
      facts.push(...uploaded.value.facts);
      setFiles((current) => current.filter((item) => item.problem !== null));
    }
    const failure = [described, uploaded].find((result) => result.status === 'rejected');
    if (failure) {
      setSubmitError(describeSubmitError(failure.reason));
    }
    if (!failure || facts.length > 0) {
      onDone(facts);
    }
  };

  return {
    text,
    setText: (value: string) => {
      setText(value);
      setFormError(null);
    },
    links,
    removeLink: (link: string) => {
      setLinks(links.filter((item) => item !== link));
    },
    linkDraft,
    setLinkDraft: (value: string) => {
      setLinkDraft(value);
      setLinkError(null);
    },
    linkError,
    addLink,
    files,
    addFiles,
    removeFile: (id: string) => {
      setFiles(files.filter((item) => item.id !== id));
    },
    formError,
    submitError,
    isProcessing,
    submit,
  };
}

export type DescribeFormState = ReturnType<typeof useDescribeForm>;
