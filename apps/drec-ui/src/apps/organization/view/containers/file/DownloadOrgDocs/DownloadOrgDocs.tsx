import { DownloadableChip } from '@energyweb/origin-ui-core';
import React, { FC } from 'react';
import { fileDownloadHandler } from 'api';
import { useStyles } from './DownloadOrgDocs.styles';

export interface DownloadOrgDocsProps {
    documents: string[];
    blockTitle: string;
}

export const DownloadOrgDocs: FC<DownloadOrgDocsProps> = ({ documents, blockTitle }) => {
    const classes = useStyles();
    return (
        <aside className={classes.thumbsContainer}>
            {documents?.map((documentId, index) => (
                <DownloadableChip
                    key={documentId}
                    downloadFunc={fileDownloadHandler}
                    documentId={documentId}
                    name={blockTitle}
                    label={`${
                        documents.length > 1 ? `${blockTitle} ${index + 1}` : `${blockTitle}`
                    }`}
                />
            ))}
        </aside>
    );
};
