import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es', 'ru'] as const;
const DEFAULT_LOCALE = 'pt-BR';

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const raw = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = SUPPORTED_LOCALES.includes(raw as any) ? raw! : DEFAULT_LOCALE;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
