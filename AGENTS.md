<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store user-uploaded company logos in the private `company-logos` bucket and expose only temporary signed URLs, because team branding is authenticated data.
- Load the uploaded sale-bell MP3 through a Lovable asset pointer and play it only when a sale starts the Central TV blackout, because Web Push sound is controlled by the mobile operating system.
- Use the uploaded Dábliu W artwork for the installed-app icons and favicon so mobile home screens show the current brand.
- Allow the public account setup only while no Director exists; all later accounts must be created through the authenticated hierarchy, because public role selection enables privilege escalation.
- Store company names on Representative profiles, management names only on Master profiles, and team names only on Supervisor profiles, because those labels belong to different hierarchy levels.
- Mutate goals through authenticated server functions and user-scoped RLS; only the creator or a Director may edit or delete them.
