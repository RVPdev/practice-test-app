/**
 * In-app copy of TERMS.md and PRIVACY.md, for the welcome screen's consent
 * flow. Keep these in sync with the repo-root .md files when either changes -
 * the .md files are the canonical documents (GitHub, app store listings);
 * this is the same content reflowed into plain sections for in-app display.
 */

export type LegalSection = { heading: string; paragraphs: string[] };

export const TERMS_UPDATED = 'September 12, 2026';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'What the Service Is',
    paragraphs: [
      'The Practice Test App ("the Service") is a self-study practice-exam tool. It lets you take practice questions (built in, imported, or created by you), in a timed "mock" mode or an untimed "practice" mode with instant feedback, and keeps a local history of your attempts and scores.',
      'The Service is provided for personal, non-commercial, educational use.',
    ],
  },
  {
    heading: 'No Affiliation; Trademarks',
    paragraphs: [
      'Some bundled question sets are aligned to the publicly published exam objectives of third-party certifications (for example, CompTIA A+ and CompTIA Security+). The Service is not affiliated with, sponsored by, endorsed by, or otherwise connected to CompTIA or any other certification body, vendor, or exam provider. Any such names, certification names, and trademarks are the property of their respective owners and are referenced solely to describe what the practice content targets.',
      'Bundled practice questions are independently authored based on publicly available exam objectives and topic weightings. They are not copied from, and do not reproduce, any real exam’s actual questions, and they are not "exam dumps" or leaked material.',
    ],
  },
  {
    heading: 'No Guarantee of Results',
    paragraphs: [
      'The Service is a study aid only. Practice scores, feedback, and content in the Service are not a prediction or guarantee of your performance on, or of passing, any real certification exam or other test. Real exams are written, scored, and administered entirely by third parties outside our control, and may differ from the Service’s practice content in coverage, difficulty, format, and passing criteria.',
      'We are not responsible for, and you agree not to hold us liable for, any outcome of a real exam you take, including a failing result, regardless of your use of the Service.',
    ],
  },
  {
    heading: 'Your Content',
    paragraphs: [
      'The Service lets you create question sets and import question sets from other sources. All such content is stored locally on your own device or browser - we do not receive, host, review, or store it on any server.',
      'You are solely responsible for any content you create or import, including making sure you have the right to use it and that it does not infringe anyone’s copyright or other rights, contain real/leaked exam questions, or violate any certification body’s candidate agreement. If you export a set and share it with someone else, that exchange is between you and them - we are not a party to it.',
    ],
  },
  {
    heading: 'License to Use the Service',
    paragraphs: [
      'We grant you a limited, personal, revocable, non-exclusive license to use the Service on your own devices for your own personal, non-commercial use. This license does not give you any right to the underlying source code.',
      'All rights in the Service not expressly granted to you are reserved.',
    ],
  },
  {
    heading: '"As Is"; No Warranties',
    paragraphs: [
      'The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including any implied warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement.',
    ],
  },
  {
    heading: 'Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, the developer will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, goodwill, or exam results, arising out of your use of the Service.',
      'The Service is provided free of charge. To the extent any liability cannot be excluded under applicable law, our total aggregate liability to you for any claim arising from the Service is limited to US $0.',
    ],
  },
  {
    heading: 'Availability, Age, and Changes',
    paragraphs: [
      'We may modify, suspend, or discontinue the Service, or any bundled content, at any time, with or without notice, and without liability to you.',
      'The Service is not directed at children under 13. These Terms may be updated from time to time; continuing to use the Service after a change means you accept the updated Terms.',
    ],
  },
  {
    heading: 'Governing Law',
    paragraphs: [
      'These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-laws principles, regardless of where you access the Service from.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions about these Terms can be raised by opening an issue at github.com/RVPdev/practice-test-app/issues.',
    ],
  },
];

export const PRIVACY_UPDATED = 'September 12, 2026';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'What We Collect',
    paragraphs: [
      'Nothing. The app has no account system, sign-up, or login; does not collect your name, email, or any other personal information; does not use analytics, crash reporting, advertising, or tracking of any kind; and does not transmit question sets, answers, or attempt history anywhere. They never leave your device.',
    ],
  },
  {
    heading: 'Where Your Data Lives',
    paragraphs: [
      'Everything the app stores - bundled and imported question sets, sets you build, and your attempt history - is saved locally using your device’s or browser’s own storage. It is private to that device or browser, not synced anywhere, and fully under your control: you can delete it in the app or by clearing your device/browser storage at any time.',
      'Because we never receive your data, we cannot back it up, restore it, or retrieve it for you if it’s lost.',
    ],
  },
  {
    heading: 'Hosting Provider Logs',
    paragraphs: [
      'The web build is hosted on GitHub Pages. Like virtually any web host, GitHub may automatically log standard technical request data (such as IP address and browser type) as part of operating its infrastructure. That logging is performed by GitHub, not by us.',
    ],
  },
  {
    heading: 'Children’s Privacy',
    paragraphs: [
      'The app does not knowingly collect personal information from anyone, including children, because it does not collect personal information from anyone. It is not directed at children under 13.',
    ],
  },
  {
    heading: 'Changes and Contact',
    paragraphs: [
      'We may update this policy as the app changes. Questions can be raised by opening an issue at github.com/RVPdev/practice-test-app/issues.',
    ],
  },
];
