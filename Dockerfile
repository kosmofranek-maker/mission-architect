FROM python:3.13-slim
WORKDIR /app
COPY engine engine
COPY web web
COPY server.py .
RUN mkdir -p data
ENV PORT=8600
EXPOSE 8600
CMD ["python", "server.py"]
