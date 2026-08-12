import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%236d28d9%22/><path d=%22M12 19s6-3 6-7.5V7l-6-2.25L6 7v4.5C6 16 12 19 12 19z%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221.8%22 stroke-linejoin=%22round%22/></svg>"
        />
        <meta name="theme-color" content="#6d28d9" />
        <meta property="og:site_name" content="ShowSure" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
