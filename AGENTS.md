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
- Load the uploaded sale-bell MP3 through a Lovable asset pointer and play it only for foreground sale alerts, because Web Push sound is controlled by the mobile operating system.
