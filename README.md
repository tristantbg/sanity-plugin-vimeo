# sanity-plugin-vimeo

Once installed, this plugin will create a Schema for Vimeo videos.

The only config required is to put the Vimeo Access Token in an `.env.development` file like:

```
SANITY_STUDIO_VIMEO_ACCESS_TOKEN='xxx'
SANITY_STUDIO_VIMEO_FOLDER_ID='xxx' // Optional
```

You will see a button at the top of the dashboard which will fetch videos from the Vimeo REST API and insert them into the site.

Then reference it in schemas :

```
{
  title: 'Video',
  name: 'video',
  type: 'reference',
  to: [
    {
      type: 'vimeo',
    },
  ],
}
```