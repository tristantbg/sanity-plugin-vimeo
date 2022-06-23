import client from 'part:@sanity/base/client';
import React, { useState } from 'react';
import { FaSync } from 'react-icons/fa';
import { Button } from '@sanity/ui';
import { addKeys } from './helpers';
import styles from './VimeoComponent.css';

const VimeoComponent = () => {
  const [count, setCount] = useState(false);
  const [countPages, setCountPages] = useState(false);
  const [doingPage, setDoingPage] = useState(false);

  const videos = [];
  const vimeoAccessToken = process.env.SANITY_STUDIO_VIMEO_ACCESS_TOKEN;
  const vimeoFolderId = process.env.SANITY_STUDIO_VIMEO_FOLDER_ID;
  const vimeoFetchUrlParams = "?fields=uri,modified_time,created_time,name,description,link,pictures,files,width,height,duration&per_page=100"
  const vimeoFetchUrl = vimeoFolderId ? `https://api.vimeo.com/me/projects/${vimeoFolderId}/videos${vimeoFetchUrlParams}` : `https://api.vimeo.com/me/videos${vimeoFetchUrlParams}`;

  function importVimeo(url) {

    let nextPage;
    let canFetchFiles;

    fetch(`https://api.vimeo.com${url}`, {
      headers: {
        Authorization: `Bearer ${vimeoAccessToken}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        nextPage = res.paging.next;
        setDoingPage(`Importing Page ${res.page} of ${Math.ceil(res.total / res.per_page)}…`);
        const transaction = client.withConfig({apiVersion: '2021-10-21'}).transaction();

        res.data.forEach((video) => {
          if (video.files) {
            const videoObject = {
              _id: `vimeo-${video.uri.split('/').pop()}`,
              _type: 'vimeo',
              aspectRatio: video.width / video.height,
              description: video.description || '',
              duration: video.duration,
              height: video.height,
              link: video.link,
              name: video.name,
              pictures: addKeys(video.pictures.sizes, 'link'),
              srcset: addKeys(video.files, 'md5'),
              width: video.width,
            };
            transaction.createOrReplace(videoObject);
            videos.push(videoObject);
          } else {
            canFetchFiles = false
            setDoingPage(`This token doesn’t have the "files" scope or this account is not a PRO account`)
            console.warn(`This token doesn’t have the "files" scope or this account is not a PRO account`)
          }
        });

        if (canFetchFiles !== false) {
          return transaction
            .commit()
            .then((response) =>
              nextPage ? importVimeo(nextPage) : (setDoingPage(`Finished`), deleteIncompatibleVimeoDocuments(videos)),
            )
            .catch((error) => {
              console.error('Update failed: ', error.message);
            });
        }
      });
  }

  function deleteIncompatibleVimeoDocuments(videos) {
    const valid_ids = videos.map(v => v._id)
    const query = '*[_type == "vimeo"] {_id}'

    client.withConfig({apiVersion: '2021-10-21'}).fetch(query).then(documents => {
      let transaction = client.withConfig({apiVersion: '2021-10-21'}).transaction()
      documents.forEach(document => {
        if (!valid_ids.includes(document._id)) {
          transaction.delete(document._id)
        }
      })
      transaction
      .commit()
      .catch(error => {
        console.error('Sanity error:', error);
        // return {
        //     statusCode: 500,
        //     body: JSON.stringify({
        //         error: 'An internal server error has occurred',
        //     })
        // };
      })
    })
  }

  function fetchVimeo() {
    fetch(vimeoFetchUrl, {
      headers: {
        Authorization: `Bearer ${vimeoAccessToken}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        setCount(res.total);
        setCountPages(Math.ceil(res.total / res.per_page));

        importVimeo(res.paging.first, 'first');
      });
  }

  return (
    <div className={styles.container}>
      {vimeoAccessToken && (
        <>
          <Button
            fontSize={[2, 2, 3]}
            icon={!doingPage || doingPage === 'Finished' ? FaSync : null}
            mode="primary"
            padding={[5, 5, 5]}
            text={!doingPage || doingPage === 'Finished' ? "Load Vimeo videos" : doingPage}
            style={{ marginBottom: '1rem' }}
            onClick={() => fetchVimeo()}
          />

          {count && countPages && (
            <p>
              <strong>
                Found {countPages} pages with {count} total Videos
              </strong>
            </p>
          )}

          {doingPage && doingPage === 'Finished' && <p>{doingPage}</p>}
        </>
      )}

      {!vimeoAccessToken && <p>No Access Token found in .env.development</p>}
    </div>
  );
};

export default VimeoComponent;
