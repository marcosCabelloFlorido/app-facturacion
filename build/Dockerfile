FROM facturacion-checkpoint:invoice-modal-20260918-085520
USER root
RUN rm -rf /app/dist /app/server /app/shared /app/db
COPY --chown=node:node dist /app/dist
COPY --chown=node:node server /app/server
COPY --chown=node:node shared /app/shared
COPY --chown=node:node db /app/db
USER node
